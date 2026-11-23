import "server-only";
import { getEnv } from "@/config/env";
import { deletionDate, warningDeadline } from "@/domain/account-policy";
import { formatDate } from "@/lib/dates";
import { AppError, notFound } from "@/server/errors";
import { logger } from "@/server/logger";
import { sendMail, supportEmail, type MailMessage } from "@/server/mail/mailer";
import { accountDeleted, accountWarning, deletionNotice } from "@/server/mail/templates";
import { buildReportModel } from "@/server/reports/view-model";
import { csvGenerator } from "@/server/reports/generators/csv.generator";
import { accountLifecycleRepository as repo } from "@/server/repositories/account-lifecycle.repository";
import { adminRepository } from "@/server/repositories/admin.repository";
import { profileRepository } from "@/server/repositories/profile.repository";
import type { SafeUser } from "@/server/repositories/user.repository";
import { isAdminEmail } from "@/server/auth/admin";
import { activityService } from "./activity.service";
import { loadHealthData } from "./health-data.service";
import { labFileService } from "./lab-file.service";

const SYSTEM = "system";

/** Sends an email without letting a delivery failure undo the account decision already saved. */
async function notify(message: MailMessage) {
  try {
    return (await sendMail(message)).sent;
  } catch (error) {
    logger.error("Account email failed", { subject: message.subject, error: String(error) });
    return false;
  }
}

/** One CSV per patient profile with every reading, attached to the final notice so nothing is lost. */
async function exportAttachments(userId: string, timeZone: string) {
  const profiles = await profileRepository.listByUser(userId);
  const range = { from: new Date(0), to: new Date(Date.now() + 86_400_000) };
  return Promise.all(
    profiles.map(async (profile) => {
      const data = await loadHealthData(profile, range);
      const content = (await csvGenerator.generate({ data, model: buildReportModel(data, timeZone), timeZone })) as string;
      const slug = profile.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "profile";
      return { filename: `healthtrack-${slug}-all-readings.csv`, content, contentType: "text/csv; charset=utf-8" };
    }),
  );
}

async function target(userId: string) {
  const detail = await adminRepository.userDetail(userId);
  if (!detail) throw notFound("User");
  if (isAdminEmail(detail.user.email)) throw new AppError("Admin accounts can't be changed from the panel.", "BAD_REQUEST");
  return detail.user;
}

type NoticeUser = { id: string; email: string; name: string; timezone: string };

/** Final notice: suspension reason, deletion date and a full CSV export of the account's readings. */
async function sendDeletionNotice(user: NoticeUser, reason: string, deletionAt: Date) {
  const attachments = await exportAttachments(user.id, user.timezone).catch((error) => {
    logger.error("Data export for deletion notice failed", error);
    return [];
  });
  return notify({
    to: user.email,
    ...deletionNotice({ name: user.name, reason, deletionDate: formatDate(deletionAt, user.timezone), support: supportEmail(), hasAttachment: attachments.length > 0 }),
    attachments,
  });
}

async function suspendWithNotice(user: NoticeUser, reason: string, actor: string) {
  const deletionAt = deletionDate();
  await repo.suspend({ userId: user.id, email: user.email, reason, deletionAt, actor });
  return { deletionAt, emailSent: await sendDeletionNotice(user, reason, deletionAt) };
}

export const accountLifecycleService = {
  /** Flags the account, emails the reason and a 14-day reply-by date. */
  async warn(admin: { email: string }, userId: string, reason: string) {
    const user = await target(userId);
    if (user.status === "SUSPENDED") throw new AppError("Reactivate the account before warning it.", "CONFLICT");
    const deadline = warningDeadline();
    await repo.warn({ userId, email: user.email, reason, deadline, actor: admin.email });
    const emailSent = await notify({
      to: user.email,
      ...accountWarning({ name: user.name, reason, deadline: formatDate(deadline, user.timezone), appUrl: getEnv().APP_URL, support: supportEmail() }),
    });
    return { emailSent };
  },

  /** Suspends now; with `scheduleDeletion` the 30-day countdown and the final notice (with a data export) start too. */
  async suspend(admin: { email: string }, userId: string, reason: string, scheduleDeletion: boolean) {
    const user = await target(userId);
    if (user.status === "SUSPENDED") throw new AppError("Already suspended.", "CONFLICT");
    if (scheduleDeletion) return suspendWithNotice(user, reason, admin.email);
    await repo.suspend({ userId, email: user.email, reason, deletionAt: null, actor: admin.email });
    return { deletionAt: null, emailSent: false };
  },

  async reactivate(admin: { email: string }, userId: string, reason?: string) {
    const user = await target(userId);
    if (user.status === "ACTIVE") throw new AppError("Account is already active.", "CONFLICT");
    await repo.reactivate({ userId, email: user.email, reason: reason || null, actor: admin.email });
  },

  async scheduleDeletion(admin: { email: string }, userId: string) {
    const user = await target(userId);
    if (user.status !== "SUSPENDED") throw new AppError("Only suspended accounts can be scheduled for deletion.", "CONFLICT");
    if (user.deletionScheduledAt) throw new AppError("Deletion is already scheduled.", "CONFLICT");
    const deletionAt = deletionDate();
    await repo.scheduleDeletion({ userId, email: user.email, deletionAt, actor: admin.email, reason: user.statusReason });
    return { deletionAt, emailSent: await sendDeletionNotice(user, user.statusReason ?? "Account review", deletionAt) };
  },

  async cancelDeletion(admin: { email: string }, userId: string) {
    const user = await target(userId);
    if (!user.deletionScheduledAt) throw new AppError("No deletion is scheduled.", "CONFLICT");
    await repo.scheduleDeletion({ userId, email: user.email, deletionAt: null, actor: admin.email, reason: null });
  },

  /** The warned user's reply from inside the app; it stops the automatic suspension. */
  async respond(user: SafeUser, response: string) {
    if (user.status !== "WARNED") throw new AppError("There is no open warning on your account.", "CONFLICT");
    if (user.warningRespondedAt) throw new AppError("We already have your response.", "CONFLICT");
    await repo.respond(user.id, response);
    await activityService.track("WARNING_RESPONDED", { userId: user.id });
  },

  /**
   * Daily job: overdue warnings -> suspend + schedule deletion (+ notice with data export);
   * deletion date reached -> final email, then permanent deletion. One failure doesn't stop the rest.
   */
  async runDaily(now = new Date()) {
    const result = { suspended: 0, deleted: 0, failed: 0 };
    for (const user of await repo.overdueWarnings(now)) {
      try {
        await suspendWithNotice(user, `No response to warning: ${user.statusReason ?? "account review"}`, SYSTEM);
        result.suspended++;
      } catch (error) {
        result.failed++;
        logger.error("Auto-suspend failed", { userId: user.id, error: String(error) });
      }
    }
    for (const user of await repo.dueForDeletion(now)) {
      try {
        await notify({ to: user.email, ...accountDeleted(user.name) });
        await labFileService.deleteWith({ userId: user.id }, () => repo.deleteAccount({ userId: user.id, email: user.email, reason: user.statusReason, actor: SYSTEM }));
        result.deleted++;
      } catch (error) {
        result.failed++;
        logger.error("Scheduled deletion failed", { userId: user.id, error: String(error) });
      }
    }
    return result;
  },
};

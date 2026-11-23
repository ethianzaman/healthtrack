import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/server/db";

/** Account standing changes. Every change writes an AdminAction row in the same transaction. */

const audit = (data: { actor: string; userId: string; email: string; action: string; reason: string | null }) =>
  db.adminAction.create({ data: { adminEmail: data.actor, targetUserId: data.userId, targetEmail: data.email, action: data.action, reason: data.reason } });

const emailHash = (email: string) => createHash("sha256").update(email.toLowerCase()).digest("hex");

/** "rahim@gmail.com" -> "ra***@gmail.com": enough to recognise a case, not enough to contact anyone. */
export function maskEmail(email: string) {
  const [local, domain = ""] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

export const accountLifecycleRepository = {
  warn(o: { userId: string; email: string; reason: string; deadline: Date; actor: string }) {
    return db.$transaction([
      db.user.update({
        where: { id: o.userId },
        data: {
          status: "WARNED",
          statusReason: o.reason,
          statusChangedAt: new Date(),
          warningDeadlineAt: o.deadline,
          warningResponse: null,
          warningRespondedAt: null,
          deletionScheduledAt: null,
        },
        select: { id: true },
      }),
      audit({ actor: o.actor, userId: o.userId, email: o.email, action: "WARN", reason: o.reason }),
    ]);
  },

  respond(userId: string, response: string) {
    return db.user.update({ where: { id: userId }, data: { warningResponse: response, warningRespondedAt: new Date() }, select: { id: true } });
  },

  suspend(o: { userId: string; email: string; reason: string; deletionAt: Date | null; actor: string }) {
    return db.$transaction([
      db.user.update({
        where: { id: o.userId },
        data: { status: "SUSPENDED", statusReason: o.reason, statusChangedAt: new Date(), warningDeadlineAt: null, deletionScheduledAt: o.deletionAt },
        select: { id: true },
      }),
      audit({ actor: o.actor, userId: o.userId, email: o.email, action: o.deletionAt ? "SUSPEND_AND_SCHEDULE_DELETION" : "SUSPEND", reason: o.reason }),
    ]);
  },

  scheduleDeletion(o: { userId: string; email: string; deletionAt: Date | null; actor: string; reason: string | null }) {
    return db.$transaction([
      db.user.update({ where: { id: o.userId }, data: { deletionScheduledAt: o.deletionAt }, select: { id: true } }),
      audit({ actor: o.actor, userId: o.userId, email: o.email, action: o.deletionAt ? "SCHEDULE_DELETION" : "CANCEL_DELETION", reason: o.reason }),
    ]);
  },

  reactivate(o: { userId: string; email: string; reason: string | null; actor: string }) {
    return db.$transaction([
      db.user.update({
        where: { id: o.userId },
        data: { status: "ACTIVE", statusReason: null, statusChangedAt: new Date(), warningDeadlineAt: null, deletionScheduledAt: null },
        select: { id: true },
      }),
      audit({ actor: o.actor, userId: o.userId, email: o.email, action: "REACTIVATE", reason: o.reason }),
    ]);
  },

  /** Warned accounts whose reply-by date has passed without a response. */
  overdueWarnings(now: Date) {
    return db.user.findMany({
      where: { status: "WARNED", warningDeadlineAt: { lte: now }, warningRespondedAt: null },
      select: { id: true, email: true, name: true, statusReason: true, timezone: true },
    });
  },

  dueForDeletion(now: Date) {
    return db.user.findMany({
      where: { status: "SUSPENDED", deletionScheduledAt: { lte: now } },
      select: { id: true, email: true, name: true, statusReason: true },
    });
  },

  /**
   * Permanently deletes an account and everything it owns. Children are removed explicitly
   * (not left to FK cascades) so nothing is orphaned whatever the database settings.
   * Keeps only a tombstone: email hash, reason, who and when; earlier audit rows get a masked email.
   */
  deleteAccount(o: { userId: string; email: string; reason: string | null; actor: string }) {
    const byOwner = { profile: { userId: o.userId } };
    const masked = maskEmail(o.email);
    return db.$transaction([
      db.bloodPressureReading.deleteMany({ where: byOwner }),
      db.glucoseReading.deleteMany({ where: byOwner }),
      db.medication.deleteMany({ where: byOwner }),
      db.labReportFileChunk.deleteMany({ where: { file: { report: byOwner } } }),
      db.labReportFile.deleteMany({ where: { report: byOwner } }),
      db.labReport.deleteMany({ where: byOwner }),
      db.healthCondition.deleteMany({ where: byOwner }),
      db.prescription.deleteMany({ where: byOwner }),
      db.shareLink.deleteMany({ where: byOwner }),
      db.profile.deleteMany({ where: { userId: o.userId } }),
      db.oneTimeCode.deleteMany({ where: { userId: o.userId } }),
      db.activityEvent.deleteMany({ where: { userId: o.userId } }),
      db.user.delete({ where: { id: o.userId }, select: { id: true } }),
      db.deletedAccount.create({ data: { emailHash: emailHash(o.email), reason: o.reason, deletedBy: o.actor } }),
      db.adminAction.updateMany({ where: { targetUserId: o.userId }, data: { targetEmail: masked } }),
      audit({ actor: o.actor, userId: o.userId, email: masked, action: "DELETE", reason: o.reason }),
    ]);
  },
};

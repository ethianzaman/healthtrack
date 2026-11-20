import "server-only";
import type { AccountStatus, Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

/**
 * Read models for /admin. PRIVACY RULE: these queries select account metadata and
 * counts only. Nothing here may select a reading value, medicine, diagnosis or note.
 */

const adminUserSelect = {
  id: true,
  email: true,
  name: true,
  plan: true,
  status: true,
  statusReason: true,
  statusChangedAt: true,
  timezone: true,
  createdAt: true,
  lastLoginAt: true,
  lastActiveAt: true,
  emailVerifiedAt: true,
  warningDeadlineAt: true,
  warningResponse: true,
  warningRespondedAt: true,
  deletionScheduledAt: true,
} satisfies Prisma.UserSelect;

export type AdminUser = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>;

const DAY_MS = 86_400_000;
const since = (days: number) => new Date(Date.now() - days * DAY_MS);

/** Event counts per user and type since a date, as Map<userId, Map<type, count>>. */
async function eventCounts(userIds: string[], types: string[], from: Date) {
  const rows = await db.activityEvent.groupBy({
    by: ["userId", "type"],
    where: { userId: { in: userIds }, type: { in: types }, createdAt: { gte: from } },
    _count: { _all: true },
  });
  const out = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (!r.userId) continue;
    const m = out.get(r.userId) ?? new Map<string, number>();
    m.set(r.type, r._count._all);
    out.set(r.userId, m);
  }
  return out;
}

/** Number of readings per user (blood pressure + glucose), counted, never read. */
async function readingCounts(userIds: string[]) {
  const profiles = await db.profile.findMany({ where: { userId: { in: userIds } }, select: { id: true, userId: true } });
  const ownerOf = new Map(profiles.map((p) => [p.id, p.userId]));
  const profileIds = profiles.map((p) => p.id);
  const [bp, glucose] = await Promise.all([
    db.bloodPressureReading.groupBy({ by: ["profileId"], where: { profileId: { in: profileIds } }, _count: { _all: true } }),
    db.glucoseReading.groupBy({ by: ["profileId"], where: { profileId: { in: profileIds } }, _count: { _all: true } }),
  ]);
  const out = new Map<string, number>();
  for (const r of [...bp, ...glucose]) {
    const userId = ownerOf.get(r.profileId)!;
    out.set(userId, (out.get(userId) ?? 0) + r._count._all);
  }
  return out;
}

export const adminRepository = {
  async overview() {
    const [users, active7, active30, signups30, suspended, warned, downloads, events] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { lastActiveAt: { gte: since(7) } } }),
      db.user.count({ where: { lastActiveAt: { gte: since(30) } } }),
      db.user.count({ where: { createdAt: { gte: since(30) } } }),
      db.user.count({ where: { status: "SUSPENDED" } }),
      db.user.count({ where: { status: "WARNED" } }),
      db.activityEvent.groupBy({
        by: ["detail"],
        where: { type: "REPORT_DOWNLOAD", createdAt: { gte: since(30) } },
        _count: { _all: true },
      }),
      db.activityEvent.findMany({
        where: { type: { in: ["REGISTER", "LOGIN", "REPORT_DOWNLOAD"] }, createdAt: { gte: since(30) } },
        select: { type: true, createdAt: true },
      }),
    ]);
    return {
      users,
      active7,
      active30,
      signups30,
      suspended,
      warned,
      downloadsByFormat: Object.fromEntries(downloads.map((d) => [d.detail ?? "unknown", d._count._all])) as Record<string, number>,
      events,
    };
  },

  async listUsers({ q, status, page, pageSize }: { q?: string; status?: AccountStatus; page: number; pageSize: number }) {
    const where: Prisma.UserWhereInput = {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ email: { contains: q } }, { name: { contains: q } }] } : {}),
    };
    const [total, users] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        select: adminUserSelect,
        orderBy: [{ lastActiveAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    const ids = users.map((u) => u.id);
    const [events, readings] = await Promise.all([eventCounts(ids, ["LOGIN", "REPORT_DOWNLOAD"], since(30)), readingCounts(ids)]);
    return {
      total,
      users: users.map((u) => ({
        ...u,
        logins30: events.get(u.id)?.get("LOGIN") ?? 0,
        downloads30: events.get(u.id)?.get("REPORT_DOWNLOAD") ?? 0,
        readings: readings.get(u.id) ?? 0,
      })),
    };
  },

  async userDetail(id: string) {
    const user = await db.user.findUnique({ where: { id }, select: adminUserSelect });
    if (!user) return null;
    const [profiles, readings, medications, prescriptions, shareLinks, events, actions] = await Promise.all([
      db.profile.count({ where: { userId: id } }),
      readingCounts([id]),
      db.medication.count({ where: { profile: { userId: id } } }),
      db.prescription.count({ where: { profile: { userId: id } } }),
      db.shareLink.count({ where: { profile: { userId: id } } }),
      db.activityEvent.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, type: true, detail: true, country: true, createdAt: true } }),
      db.adminAction.findMany({ where: { targetUserId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    ]);
    return { user, counts: { profiles, readings: readings.get(id) ?? 0, medications, prescriptions, shareLinks }, events, actions };
  },

};

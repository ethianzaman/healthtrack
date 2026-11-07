import "server-only";
import { db } from "@/server/db";

export const shareLinkRepository = {
  list(profileId: string) {
    return db.shareLink.findMany({ where: { profileId }, orderBy: { createdAt: "desc" } });
  },

  countActive(profileIds: string[], now = new Date()) {
    return db.shareLink.count({
      where: { profileId: { in: profileIds }, revokedAt: null, expiresAt: { gt: now } },
    });
  },

  create(data: { profileId: string; tokenHash: string; label: string; expiresAt: Date }) {
    return db.shareLink.create({ data });
  },

  findActiveByHash(tokenHash: string, now = new Date()) {
    return db.shareLink.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: now } },
      include: { profile: { include: { user: { select: { timezone: true } } } } },
    });
  },

  touch(id: string) {
    return db.shareLink.update({ where: { id }, data: { lastAccessedAt: new Date() } });
  },

  async revokeForProfile(id: string, profileId: string) {
    const { count } = await db.shareLink.updateMany({
      where: { id, profileId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return count > 0;
  },
};

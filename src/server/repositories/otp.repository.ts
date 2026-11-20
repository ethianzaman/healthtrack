import "server-only";
import { db } from "@/server/db";
import type { OtpPurpose } from "@/server/security/otp";

export const otpRepository = {
  latestActive(userId: string, purpose: OtpPurpose) {
    return db.oneTimeCode.findFirst({ where: { userId, purpose, consumedAt: null }, orderBy: { createdAt: "desc" } });
  },

  latest(userId: string, purpose: OtpPurpose) {
    return db.oneTimeCode.findFirst({ where: { userId, purpose }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
  },

  countSince(userId: string, purpose: OtpPurpose, since: Date) {
    return db.oneTimeCode.count({ where: { userId, purpose, createdAt: { gte: since } } });
  },

  /** A new code replaces any earlier unused one. */
  replace(data: { userId: string; purpose: OtpPurpose; codeHash: string; expiresAt: Date }) {
    return db.$transaction([
      db.oneTimeCode.updateMany({ where: { userId: data.userId, purpose: data.purpose, consumedAt: null }, data: { consumedAt: new Date() } }),
      db.oneTimeCode.create({ data, select: { id: true } }),
    ]);
  },

  addAttempt(id: string) {
    return db.oneTimeCode.update({ where: { id }, data: { attempts: { increment: 1 } }, select: { attempts: true } });
  },

  consume(id: string) {
    return db.oneTimeCode.update({ where: { id }, data: { consumedAt: new Date() }, select: { id: true } });
  },
};

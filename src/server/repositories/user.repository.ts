import "server-only";
import { db } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";

/** Never select the password hash unless explicitly required. */
const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  plan: true,
  timezone: true,
  status: true,
  statusReason: true,
  lastActiveAt: true,
  emailVerifiedAt: true,
  warningDeadlineAt: true,
  warningRespondedAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type SafeUser = Prisma.UserGetPayload<{ select: typeof safeUserSelect }>;

export const userRepository = {
  findById(id: string) {
    return db.user.findUnique({ where: { id }, select: safeUserSelect });
  },

  findByEmailWithPassword(email: string) {
    return db.user.findUnique({ where: { email } });
  },

  existsByEmail(email: string) {
    return db.user.count({ where: { email } }).then((n) => n > 0);
  },

  createWithDefaultProfile(data: { email: string; name: string; passwordHash: string; timezone: string; emailVerifiedAt: Date | null }) {
    return db.user.create({
      data: {
        ...data,
        // mmol/L is what most of our users (South Asia, UK, EU) read on their meters.
        profiles: { create: { name: data.name, relation: "Self", isDefault: true, glucoseUnit: "MMOL_L" } },
      },
      select: safeUserSelect,
    });
  },

  findByEmail(email: string) {
    return db.user.findUnique({ where: { email }, select: safeUserSelect });
  },

  markEmailVerified(id: string) {
    return db.user.update({ where: { id }, data: { emailVerifiedAt: new Date() }, select: { id: true } });
  },

  touch(id: string, data: { lastActiveAt?: Date; lastLoginAt?: Date }) {
    return db.user.update({ where: { id }, data, select: { id: true } });
  },

  setPasswordHash(id: string, passwordHash: string) {
    return db.user.update({ where: { id }, data: { passwordHash }, select: { id: true } });
  },

  update(id: string, data: Pick<Prisma.UserUpdateInput, "name" | "timezone">) {
    return db.user.update({ where: { id }, data, select: safeUserSelect });
  },
};

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

  createWithDefaultProfile(data: { email: string; name: string; passwordHash: string; timezone: string }) {
    return db.user.create({
      data: {
        ...data,
        profiles: { create: { name: data.name, relation: "Self", isDefault: true } },
      },
      select: safeUserSelect,
    });
  },

  update(id: string, data: Pick<Prisma.UserUpdateInput, "name" | "timezone">) {
    return db.user.update({ where: { id }, data, select: safeUserSelect });
  },
};

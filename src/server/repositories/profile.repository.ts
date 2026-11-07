import "server-only";
import { db } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";

/** All profile queries are scoped by owner to enforce tenant isolation. */
export const profileRepository = {
  listByUser(userId: string) {
    return db.profile.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
  },

  findForUser(id: string, userId: string) {
    return db.profile.findFirst({ where: { id, userId } });
  },

  findDefault(userId: string) {
    return db.profile.findFirst({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
  },

  countByUser(userId: string) {
    return db.profile.count({ where: { userId } });
  },

  create(userId: string, data: Omit<Prisma.ProfileUncheckedCreateInput, "userId">) {
    return db.profile.create({ data: { ...data, userId } });
  },

  async updateForUser(id: string, userId: string, data: Prisma.ProfileUpdateManyMutationInput) {
    const { count } = await db.profile.updateMany({ where: { id, userId }, data });
    return count > 0;
  },

  async deleteForUser(id: string, userId: string) {
    const { count } = await db.profile.deleteMany({ where: { id, userId, isDefault: false } });
    return count > 0;
  },
};

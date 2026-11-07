import "server-only";
import { db } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";

export const medicationRepository = {
  list(profileId: string, { activeOnly = false } = {}) {
    return db.medication.findMany({
      where: { profileId, ...(activeOnly ? { active: true } : {}) },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });
  },

  create(profileId: string, data: Omit<Prisma.MedicationUncheckedCreateInput, "profileId">) {
    return db.medication.create({ data: { ...data, profileId } });
  },

  async updateForProfile(id: string, profileId: string, data: Prisma.MedicationUpdateManyMutationInput) {
    const { count } = await db.medication.updateMany({ where: { id, profileId }, data });
    return count > 0;
  },

  async deleteForProfile(id: string, profileId: string) {
    const { count } = await db.medication.deleteMany({ where: { id, profileId } });
    return count > 0;
  },
};

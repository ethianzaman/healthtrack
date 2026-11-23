import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

export type HealthConditionRow = Prisma.HealthConditionGetPayload<object>;

export const conditionRepository = {
  /** Ongoing first, then by name. */
  list(profileId: string) {
    return db.healthCondition.findMany({ where: { profileId }, orderBy: [{ status: "asc" }, { name: "asc" }] });
  },

  create(profileId: string, data: Omit<Prisma.HealthConditionUncheckedCreateInput, "profileId">) {
    return db.healthCondition.create({ data: { ...data, profileId }, select: { id: true } });
  },

  async updateForProfile(id: string, profileId: string, data: Prisma.HealthConditionUpdateManyMutationInput) {
    const { count } = await db.healthCondition.updateMany({ where: { id, profileId }, data });
    return count > 0;
  },

  async deleteForProfile(id: string, profileId: string) {
    const { count } = await db.healthCondition.deleteMany({ where: { id, profileId } });
    return count > 0;
  },

  /** Adds conditions named on a prescription that aren't in the list yet (case-insensitive). */
  async ensureByNames(profileId: string, names: string[], since: Date | null, doctorName: string | null) {
    if (!names.length) return;
    const existing = new Set((await db.healthCondition.findMany({ where: { profileId }, select: { name: true } })).map((c) => c.name.toLowerCase()));
    const missing = names.filter((n) => !existing.has(n.toLowerCase()));
    if (missing.length) {
      await db.healthCondition.createMany({ data: missing.map((name) => ({ profileId, name, status: "ONGOING", diagnosedOn: since, doctorName })) });
    }
  },
};

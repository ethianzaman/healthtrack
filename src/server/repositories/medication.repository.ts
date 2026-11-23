import "server-only";
import { db } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";

const withPrescription = {
  prescription: { select: { id: true, doctorName: true, doctorSpecialty: true, issuedOn: true, condition: true } },
} satisfies Prisma.MedicationInclude;

export type MedicationWithPrescription = Prisma.MedicationGetPayload<{ include: typeof withPrescription }>;

export const medicationRepository = {
  /** Every medicine of the profile with its prescription (doctor) for grouping; newest course first. */
  list(profileId: string) {
    return db.medication.findMany({
      where: { profileId },
      include: withPrescription,
      orderBy: [{ startDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    });
  },

  /** Currently taken: not stopped and course not finished. */
  listCurrent(profileId: string, now = new Date()) {
    return db.medication.findMany({
      where: { profileId, active: true, OR: [{ endDate: null }, { endDate: { gt: now } }] },
      include: withPrescription,
      orderBy: { name: "asc" },
    });
  },

  createMany(profileId: string, rows: Omit<Prisma.MedicationCreateManyInput, "profileId">[]) {
    return db.medication.createMany({ data: rows.map((r) => ({ ...r, profileId })) });
  },

  findForProfile(id: string, profileId: string) {
    return db.medication.findFirst({ where: { id, profileId }, select: { id: true, startDate: true, createdAt: true } });
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

import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";

export const prescriptionRepository = {
  /** Saves the prescription and its medicines in one write. */
  createWithMedications(
    profileId: string,
    data: {
      doctorName: string | null;
      doctorSpecialty: string | null;
      issuedOn: Date | null;
      condition: string | null;
      medications: Omit<Prisma.MedicationCreateManyInput, "profileId" | "prescriptionId">[];
    },
  ) {
    const { medications, ...prescription } = data;
    return db.prescription.create({
      data: { ...prescription, profileId, medications: { create: medications.map((m) => ({ ...m, profileId })) } },
      select: { id: true, _count: { select: { medications: true } } },
    });
  },

  async updateForProfile(id: string, profileId: string, data: Prisma.PrescriptionUpdateManyMutationInput) {
    const { count } = await db.prescription.updateMany({ where: { id, profileId }, data });
    return count > 0;
  },
};

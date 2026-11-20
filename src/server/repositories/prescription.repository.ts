import "server-only";
import { db } from "@/server/db";

export const prescriptionRepository = {
  /** Saves the prescription and its medicines in one write; each medicine inherits the condition. */
  createWithMedications(
    profileId: string,
    data: {
      doctorName: string | null;
      issuedOn: Date | null;
      condition: string | null;
      medications: { name: string; dosage: string; schedule: string; notes: string | null }[];
    },
  ) {
    const { medications, ...prescription } = data;
    return db.prescription.create({
      data: {
        ...prescription,
        profileId,
        medications: { create: medications.map((m) => ({ ...m, profileId, condition: prescription.condition })) },
      },
      select: { id: true, _count: { select: { medications: true } } },
    });
  },
};

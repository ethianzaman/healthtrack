"use server";

import { protectedAction } from "@/server/actions/safe-action";
import { notFound } from "@/server/errors";
import { medicationRepository } from "@/server/repositories/medication.repository";
import { prescriptionRepository } from "@/server/repositories/prescription.repository";
import { activityService } from "@/server/services/activity.service";
import { idSchema } from "@/features/shared/schemas";
import { medicationSchema, prescriptionSchema, toggleMedicationSchema } from "./schemas";

const revalidate = ["/medications"];

export const addMedication = protectedAction(
  medicationSchema,
  async ({ notes, condition, ...rest }, { profile }) => {
    await medicationRepository.create(profile.id, { ...rest, notes: notes || null, condition: condition || null });
    return null;
  },
  { revalidate, successMessage: "Medication added" },
);

export const toggleMedication = protectedAction(
  toggleMedicationSchema,
  async ({ id, active }, { profile }) => {
    if (!(await medicationRepository.updateForProfile(id, profile.id, { active }))) throw notFound("Medication");
    return null;
  },
  { revalidate },
);

export const deleteMedication = protectedAction(
  idSchema,
  async ({ id }, { profile }) => {
    if (!(await medicationRepository.deleteForProfile(id, profile.id))) throw notFound("Medication");
    return null;
  },
  { revalidate, successMessage: "Medication removed" },
);

export const savePrescription = protectedAction(
  prescriptionSchema,
  async ({ doctorName, issuedOn, condition, medications }, { profile }) => {
    const saved = await prescriptionRepository.createWithMedications(profile.id, {
      doctorName: doctorName || null,
      // Calendar date only; stored at UTC midnight.
      issuedOn: issuedOn ? new Date(`${issuedOn}T00:00:00Z`) : null,
      condition: condition || null,
      medications: medications.map((m) => ({ ...m, notes: m.notes || null })),
    });
    // Only the count is tracked, never the medicine names.
    await activityService.track("PRESCRIPTION_SAVED", { userId: profile.userId, detail: `${saved._count.medications} medicines` });
    return { added: saved._count.medications };
  },
  { revalidate: [...revalidate, "/reports"] },
);

"use server";

import { protectedAction } from "@/server/actions/safe-action";
import { notFound } from "@/server/errors";
import { medicationRepository } from "@/server/repositories/medication.repository";
import { idSchema } from "@/features/shared/schemas";
import { medicationSchema, toggleMedicationSchema } from "./schemas";

const revalidate = ["/medications"];

export const addMedication = protectedAction(
  medicationSchema,
  async ({ notes, ...rest }, { profile }) => {
    await medicationRepository.create(profile.id, { ...rest, notes: notes || null });
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

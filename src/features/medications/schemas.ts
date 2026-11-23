import { z } from "zod";
import { MEAL_TIMINGS } from "@/domain/medication";
import { ymdSchema } from "@/features/shared/schemas";

const optionalText = (max: number) => z.string().trim().max(max).optional();

/** One medicine row of the form (typed in, picked from the DGDA list, or read from a prescription photo). */
export const medicineItemSchema = z.object({
  name: z.string().trim().min(1, "Medicine name is required").max(100),
  form: optionalText(40),
  generic: optionalText(200),
  /** Strength, e.g. "5 mg", "5/20 mg", "10 units". */
  dosage: optionalText(60),
  schedule: z.string().trim().min(1, "Choose or type a schedule").max(120),
  mealTiming: z.enum(MEAL_TIMINGS).optional(),
  /** Course length in days; null = continue until stopped. */
  durationDays: z.number().int().min(1, "At least 1 day").max(3650).nullable().optional(),
  notes: optionalText(300),
});

/** A prescription (doctor details optional) with one or more medicines. */
export const medicinesSchema = z.object({
  doctorName: optionalText(120),
  doctorSpecialty: optionalText(80),
  issuedOn: ymdSchema.optional(),
  condition: optionalText(200),
  medications: z.array(medicineItemSchema).min(1, "Add at least one medicine").max(20, "Up to 20 medicines at a time"),
});

export const stopMedicationSchema = z.object({ id: z.string().min(1), reason: optionalText(200) });

export type MedicineItemInput = z.infer<typeof medicineItemSchema>;
export type MedicinesInput = z.infer<typeof medicinesSchema>;

/** Correcting one saved medicine; the course is counted from `startDate` (kept as it was if empty). */
export const updateMedicationSchema = medicineItemSchema.extend({ id: z.string().min(1), startDate: ymdSchema.optional() });

/** Correcting a prescription's doctor details and conditions. */
export const updatePrescriptionSchema = z.object({
  id: z.string().min(1),
  doctorName: optionalText(120),
  doctorSpecialty: optionalText(80),
  issuedOn: ymdSchema.optional(),
  condition: optionalText(200),
});

export type UpdateMedicationInput = z.infer<typeof updateMedicationSchema>;
export type UpdatePrescriptionInput = z.infer<typeof updatePrescriptionSchema>;

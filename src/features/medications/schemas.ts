import { z } from "zod";
import { ymdSchema } from "@/features/shared/schemas";

const optionalText = (max: number) => z.string().trim().max(max).optional();

export const medicationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  dosage: z.string().trim().min(1, "Dosage is required").max(60),
  schedule: z.string().trim().min(1, "Schedule is required").max(120),
  /** What the medicine treats, e.g. "Hypertension". */
  condition: optionalText(120),
  notes: optionalText(300),
});

export const toggleMedicationSchema = z.object({ id: z.string().min(1), active: z.boolean() });

/** A reviewed prescription (from a scanned photo or typed in) with its medicines. */
export const prescriptionSchema = z.object({
  doctorName: optionalText(120),
  issuedOn: ymdSchema.optional(),
  condition: optionalText(200),
  medications: z
    .array(medicationSchema.omit({ condition: true }))
    .min(1, "Add at least one medicine")
    .max(20, "Up to 20 medicines per prescription"),
});

export type MedicationInput = z.infer<typeof medicationSchema>;
export type PrescriptionInput = z.infer<typeof prescriptionSchema>;

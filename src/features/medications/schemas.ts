import { z } from "zod";

export const medicationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  dosage: z.string().trim().min(1, "Dosage is required").max(60),
  schedule: z.string().trim().min(1, "Schedule is required").max(120),
  notes: z.string().trim().max(300).optional(),
});

export const toggleMedicationSchema = z.object({ id: z.string().min(1), active: z.boolean() });

export type MedicationInput = z.infer<typeof medicationSchema>;

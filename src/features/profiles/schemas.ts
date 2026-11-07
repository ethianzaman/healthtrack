import { z } from "zod";
import { GENDER_VALUES, GLUCOSE_UNIT_VALUES } from "@/domain/enums";
import { intInRange, ymdSchema } from "@/features/shared/schemas";

export const profileSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(80),
    relation: z.string().trim().min(1, "Relation is required").max(40),
    dateOfBirth: ymdSchema.optional(),
    gender: z.enum(GENDER_VALUES).optional(),
    glucoseUnit: z.enum(GLUCOSE_UNIT_VALUES),
    bpSystolicTarget: intInRange("Systolic target", 90, 200),
    bpDiastolicTarget: intInRange("Diastolic target", 50, 130),
    glucoseLow: intInRange("Low threshold", 50, 100),
    glucoseFastingMax: intInRange("Fasting max", 70, 250),
    glucosePostMealMax: intInRange("Post-meal max", 100, 300),
  })
  .refine((v) => v.glucoseFastingMax > v.glucoseLow, {
    path: ["glucoseFastingMax"],
    message: "Must be above the low threshold",
  });

export const switchProfileSchema = z.object({ profileId: z.string().min(1) });

export const accountSchema = z.object({
  name: z.string().trim().min(2).max(80),
  timezone: z.string().min(1, "Timezone is required"),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type AccountInput = z.infer<typeof accountSchema>;

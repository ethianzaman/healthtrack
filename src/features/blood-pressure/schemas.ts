import { z } from "zod";
import { BP_LIMITS } from "@/domain/blood-pressure";
import { ARM_VALUES, TIME_OF_DAY_VALUES } from "@/domain/enums";
import { intInRange, measuredAtSchema, noteSchema } from "@/features/shared/schemas";

export const bpReadingSchema = z
  .object({
    systolic: intInRange("Systolic", BP_LIMITS.systolic.min, BP_LIMITS.systolic.max),
    diastolic: intInRange("Diastolic", BP_LIMITS.diastolic.min, BP_LIMITS.diastolic.max),
    pulse: intInRange("Pulse", BP_LIMITS.pulse.min, BP_LIMITS.pulse.max).optional(),
    timeOfDay: z.enum(TIME_OF_DAY_VALUES),
    arm: z.enum(ARM_VALUES).optional(),
    measuredAt: measuredAtSchema,
    note: noteSchema,
  })
  .refine((v) => v.systolic > v.diastolic, {
    path: ["diastolic"],
    message: "Diastolic must be lower than systolic",
  });

export type BpReadingInput = z.infer<typeof bpReadingSchema>;

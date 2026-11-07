import { z } from "zod";
import { GLUCOSE_UNIT_VALUES, MEAL_TIMING_VALUES, TIME_OF_DAY_VALUES } from "@/domain/enums";
import { GLUCOSE_LIMITS_MG_DL, toMgDl } from "@/domain/glucose";
import { measuredAtSchema, noteSchema } from "@/features/shared/schemas";

export const glucoseReadingSchema = z
  .object({
    value: z.number({ error: "Glucose value is required" }).positive("Must be positive"),
    unit: z.enum(GLUCOSE_UNIT_VALUES),
    timeOfDay: z.enum(TIME_OF_DAY_VALUES),
    mealTiming: z.enum(MEAL_TIMING_VALUES),
    measuredAt: measuredAtSchema,
    note: noteSchema,
  })
  .refine(
    (v) => {
      const mgDl = toMgDl(v.value, v.unit);
      return mgDl >= GLUCOSE_LIMITS_MG_DL.min && mgDl <= GLUCOSE_LIMITS_MG_DL.max;
    },
    { path: ["value"], message: "Value is outside the measurable range" },
  );

export type GlucoseReadingInput = z.infer<typeof glucoseReadingSchema>;

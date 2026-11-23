import { z } from "zod";
import { CONDITION_STATUSES } from "@/domain/conditions";
import { ymdSchema } from "@/features/shared/schemas";

const optionalText = (max: number) => z.string().trim().max(max).optional();

export const conditionSchema = z.object({
  /** Present when editing an existing condition. */
  id: z.string().min(1).optional(),
  name: z.string().trim().min(2, "Name is required").max(120),
  status: z.enum(CONDITION_STATUSES),
  diagnosedOn: ymdSchema.optional(),
  resolvedOn: ymdSchema.optional(),
  doctorName: optionalText(120),
  notes: optionalText(500),
});

export const conditionStatusSchema = z.object({ id: z.string().min(1), status: z.enum(CONDITION_STATUSES) });

export type ConditionInput = z.infer<typeof conditionSchema>;

import { z } from "zod";

export const idSchema = z.object({ id: z.string().min(1) });

/** ISO-8601 instant; forms convert their local datetime to ISO before submitting. */
export const measuredAtSchema = z
  .string()
  .min(1, "Date & time is required")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
  .refine((v) => Date.parse(v) <= Date.now() + 5 * 60_000, "Date can't be in the future");

export const noteSchema = z.string().trim().max(500, "Max 500 characters").optional();

/** Integer within bounds with friendly messages (empty number inputs arrive as NaN). */
export function intInRange(label: string, min: number, max: number) {
  return z
    .number({ error: `${label} is required` })
    .int(`${label} must be a whole number`)
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must be at most ${max}`);
}

export const ymdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

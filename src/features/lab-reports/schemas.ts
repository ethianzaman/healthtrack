import { z } from "zod";
import { ymdSchema } from "@/features/shared/schemas";

const optionalText = (max: number) => z.string().trim().max(max).optional();

/** Details of a test report; the photos/PDFs are uploaded separately, one per request. */
export const labReportSchema = z.object({
  title: z.string().trim().min(1, "Which test is this?").max(120),
  testDate: ymdSchema.optional(),
  labName: optionalText(120),
  prescriptionId: optionalText(40),
  notes: optionalText(500),
});

export const updateLabReportSchema = labReportSchema.extend({ id: z.string().min(1) });

export type LabReportInput = z.infer<typeof labReportSchema>;

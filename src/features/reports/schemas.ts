import { z } from "zod";
import { ymdSchema } from "@/features/shared/schemas";

export const REPORT_FORMATS = ["pdf", "docx", "csv"] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

export const REPORT_SECTIONS = ["bp", "glucose", "medications"] as const;
export type ReportSection = (typeof REPORT_SECTIONS)[number];

export const REPORT_FORMAT_LABELS: Record<ReportFormat, { label: string; hint: string }> = {
  pdf: { label: "PDF", hint: "Best for doctors - printable, with summaries" },
  docx: { label: "Word (DOCX)", hint: "Editable document" },
  csv: { label: "CSV", hint: "Raw data for Excel / Google Sheets" },
};

export const REPORT_SECTION_LABELS: Record<ReportSection, string> = {
  bp: "Blood pressure",
  glucose: "Blood glucose",
  medications: "Medications",
};

const MAX_RANGE_DAYS = 366;

export const reportQuerySchema = z
  .object({
    from: ymdSchema,
    to: ymdSchema,
    format: z.enum(REPORT_FORMATS).default("pdf"),
    sections: z.array(z.enum(REPORT_SECTIONS)).min(1, "Select at least one section"),
  })
  .refine((v) => v.from <= v.to, { path: ["to"], message: "End date must be after start date" })
  .refine((v) => (Date.parse(v.to) - Date.parse(v.from)) / 86_400_000 <= MAX_RANGE_DAYS, {
    path: ["from"],
    message: `Range can be at most ${MAX_RANGE_DAYS} days`,
  });

export type ReportQuery = z.infer<typeof reportQuerySchema>;

/** Parse URLSearchParams (multi-value `sections`) into a validated query. */
export function parseReportQuery(params: URLSearchParams) {
  return reportQuerySchema.safeParse({
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    format: params.get("format") ?? undefined,
    sections: params.getAll("sections"),
  });
}

import { z } from "zod";
import { ymdSchema } from "@/features/shared/schemas";

export const REPORT_FORMATS = ["pdf", "docx", "csv"] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

/** Order here is the order of pages in the report. */
export const REPORT_SECTIONS = ["summary", "bp", "glucose", "medications"] as const;
export type ReportSection = (typeof REPORT_SECTIONS)[number];

export const REPORT_FORMAT_LABELS: Record<ReportFormat, { label: string; hint: string }> = {
  pdf: { label: "PDF", hint: "Best for doctors - printable, with summaries" },
  docx: { label: "Word (DOCX)", hint: "Editable document" },
  csv: { label: "CSV", hint: "Raw data for Excel / Google Sheets" },
};

export const REPORT_SECTION_LABELS: Record<ReportSection, string> = {
  summary: "Health summary (conditions, treatment, changes)",
  bp: "Blood pressure",
  glucose: "Blood glucose",
  medications: "Medications",
};

/** Optional columns of the blood pressure daily table (date and the time-of-day columns are always shown). */
export const BP_REPORT_COLUMNS = ["status", "time", "pulse", "arm", "note"] as const;
export type BpReportColumn = (typeof BP_REPORT_COLUMNS)[number];
export const BP_REPORT_COLUMN_LABELS: Record<BpReportColumn, string> = {
  status: "Status (Normal / High / Danger)",
  time: "Time of each reading",
  pulse: "Pulse",
  arm: "Arm",
  note: "Notes",
};

/** Optional details in the glucose daily table (date and the meal-time columns are always shown). */
export const GLUCOSE_REPORT_COLUMNS = ["status", "time", "note"] as const;
export type GlucoseReportColumn = (typeof GLUCOSE_REPORT_COLUMNS)[number];
export const GLUCOSE_REPORT_COLUMN_LABELS: Record<GlucoseReportColumn, string> = {
  status: "Status (Normal / High / Danger)",
  time: "Time of each reading",
  note: "Notes",
};

const MAX_RANGE_DAYS = 366;

export const reportQuerySchema = z
  .object({
    from: ymdSchema,
    to: ymdSchema,
    format: z.enum(REPORT_FORMATS).default("pdf"),
    sections: z.array(z.enum(REPORT_SECTIONS)).min(1, "Select at least one section"),
    bpColumns: z.array(z.enum(BP_REPORT_COLUMNS)).default([...BP_REPORT_COLUMNS]),
    glucoseColumns: z.array(z.enum(GLUCOSE_REPORT_COLUMNS)).default([...GLUCOSE_REPORT_COLUMNS]),
  })
  .refine((v) => v.from <= v.to, { path: ["to"], message: "End date must be after start date" })
  .refine((v) => (Date.parse(v.to) - Date.parse(v.from)) / 86_400_000 <= MAX_RANGE_DAYS, {
    path: ["from"],
    message: `Range can be at most ${MAX_RANGE_DAYS} days`,
  });

export type ReportQuery = z.infer<typeof reportQuerySchema>;

/**
 * Column choices from the form. Absent = all columns (e.g. a doctor's share link).
 * The form always sends a "-" marker, so unticking every box means "no optional columns".
 */
function columnsParam<T extends string>(params: URLSearchParams, name: string, allowed: readonly T[]): T[] | undefined {
  if (!params.has(name)) return undefined;
  return params.getAll(name).filter((v): v is T => (allowed as readonly string[]).includes(v));
}

/** Parse URLSearchParams (multi-value `sections`, column choices) into a validated query. */
export function parseReportQuery(params: URLSearchParams) {
  return reportQuerySchema.safeParse({
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    format: params.get("format") ?? undefined,
    sections: params.getAll("sections"),
    bpColumns: columnsParam(params, "bpCols", BP_REPORT_COLUMNS),
    glucoseColumns: columnsParam(params, "glucoseCols", GLUCOSE_REPORT_COLUMNS),
  });
}

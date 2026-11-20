import "server-only";
import { siteConfig } from "@/config/site";
import type { Severity } from "@/domain/severity";
import { formatDate, formatDateTime } from "@/lib/dates";
import type { HealthData } from "@/server/services/health-data.service";
import { BP_REPORT_COLUMNS, GLUCOSE_REPORT_COLUMNS, type BpReportColumn, type GlucoseReportColumn } from "@/features/reports/schemas";
import { plain, type CellLine } from "./cells";
import { dailyBloodPressureTable, dailyGlucoseTable } from "./daily-log";

export { cellText, plain, type CellLine } from "./cells";

/** Which optional columns the tables show (chosen on the Reports page; share links get all). */
export interface ReportColumns {
  bp: readonly BpReportColumn[];
  glucose: readonly GlucoseReportColumn[];
}

export const ALL_REPORT_COLUMNS: ReportColumns = { bp: BP_REPORT_COLUMNS, glucose: GLUCOSE_REPORT_COLUMNS };

export interface ReportRow {
  /** Each cell is one or more lines (several readings in the same slot stack). */
  cells: CellLine[][];
  /** The row's overall status (worst reading of the day), shown as a coloured pill in `statusColumn`. */
  severity?: Severity;
  /** Colours the value of individual cells by that reading's own status. */
  cellSeverity?: (Severity | undefined)[];
}

/**
 * Format-agnostic report model. PDF and DOCX render exactly these rows, so labels,
 * rounding and classification are defined once.
 */
export interface ReportTable {
  columns: string[];
  /** Relative column widths (defaults to equal). */
  widths?: number[];
  /** Index of the per-row Status column (rendered as a pill). */
  statusColumn?: number;
  rows: ReportRow[];
  /** Small print under the table (how the status is defined). */
  footnotes?: string[];
}

export interface ReportSectionModel {
  /** Big page headline, e.g. "Blood Pressure Report". */
  title: string;
  /** Each section starts on its own page; the wide glucose table uses a landscape page. */
  orientation?: "portrait" | "landscape";
  tables: ReportTable[];
  emptyMessage?: string;
}

export interface ReportModel {
  title: string;
  appName: string;
  generatedAt: string;
  periodLabel: string;
  sections: ReportSectionModel[];
  disclaimer: string;
}

/** Severity to colour a value with; normal readings stay in the default ink colour. */
export function valueSeverity(row: ReportRow, i: number): Severity | undefined {
  const s = row.cellSeverity?.[i];
  return s && s !== "normal" ? s : undefined;
}

export function buildReportModel(data: HealthData, timeZone: string, columns: ReportColumns = ALL_REPORT_COLUMNS, generatedAt = new Date()): ReportModel {
  const { range } = data;
  const lastDay = new Date(range.to.getTime() - 1);

  const sections: ReportSectionModel[] = [];
  if (data.sections.bp) {
    sections.push({
      title: "Blood Pressure Report",
      emptyMessage: data.bp.readings.length === 0 ? "No blood pressure readings in this period." : undefined,
      tables: data.bp.readings.length ? [dailyBloodPressureTable(data.bp.readings, timeZone, columns.bp)] : [],
    });
  }
  if (data.sections.glucose) {
    sections.push({
      title: "Glucose Report",
      orientation: "landscape",
      emptyMessage: data.glucose.readings.length === 0 ? "No glucose readings in this period." : undefined,
      tables: data.glucose.readings.length ? [dailyGlucoseTable(data.glucose.readings, timeZone, data.glucose.targets, columns.glucose)] : [],
    });
  }
  if (data.sections.medications) sections.push(medicationSection(data));

  return {
    title: "Health Report",
    appName: siteConfig.name,
    generatedAt: formatDateTime(generatedAt, timeZone),
    periodLabel: `${formatDate(range.from, timeZone)} - ${formatDate(lastDay, timeZone)}`,
    sections,
    disclaimer: siteConfig.disclaimer,
  };
}

function medicationSection({ medications }: HealthData): ReportSectionModel {
  return {
    title: "Medication List",
    emptyMessage: medications.length === 0 ? "No active medications recorded." : undefined,
    tables: medications.length
      ? [
          {
            columns: ["Medicine", "Dosage", "Schedule", "For", "Notes"],
            widths: [1.4, 0.8, 1, 1.2, 1.4],
            rows: medications.map((m) => ({ cells: [m.name, m.dosage, m.schedule, m.condition ?? "", m.notes ?? ""].map(plain) })),
          },
        ]
      : [],
  };
}

import "server-only";
import { siteConfig } from "@/config/site";
import { MEAL_TIMING_TEXT, type MedicationMealTiming } from "@/domain/medication";
import type { Severity } from "@/domain/severity";
import { formatDate, formatDateTime } from "@/lib/dates";
import type { HealthData } from "@/server/services/health-data.service";
import { BP_REPORT_COLUMNS, GLUCOSE_REPORT_COLUMNS, type BpReportColumn, type GlucoseReportColumn } from "@/features/reports/schemas";
import { plain, type CellLine } from "./cells";
import { dailyBloodPressureTable, dailyGlucoseTable } from "./daily-log";
import { healthSummaryTables } from "./health-summary";

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
  /** Optional small heading above the table (when a section has more than one). */
  heading?: string;
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
  if (data.sections.summary) {
    const tables = healthSummaryTables({ conditions: data.conditions, current: data.medications, all: data.allMedications, labReports: data.labReports, range, timeZone });
    sections.push({ title: "Health Summary", tables, emptyMessage: tables.length ? undefined : "No conditions, treatment changes or tests recorded yet." });
  }
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
  if (data.sections.medications) sections.push(medicationSection(data, timeZone));

  return {
    title: "Health Report",
    appName: siteConfig.name,
    generatedAt: formatDateTime(generatedAt, timeZone),
    periodLabel: `${formatDate(range.from, timeZone)} - ${formatDate(lastDay, timeZone)}`,
    sections,
    disclaimer: siteConfig.disclaimer,
  };
}

type Med = HealthData["medications"][number];

const doctorOf = (m: Med) => [m.prescription?.doctorName, m.prescription?.doctorSpecialty].filter(Boolean).join(", ");
const nameCell = (m: Med): CellLine[] => [{ text: m.name, note: [m.form, m.generic].filter(Boolean).join(" · ") || undefined }];
const howCell = (m: Med): CellLine[] => [{ text: [m.dosage, m.schedule].filter(Boolean).join("  "), note: m.mealTiming ? MEAL_TIMING_TEXT[m.mealTiming as MedicationMealTiming] : undefined }];

function medicationSection({ medications, endedMedications }: HealthData, timeZone: string): ReportSectionModel {
  // Grouped by doctor so treatments from different doctors read as separate prescriptions.
  const current = [...medications].sort((a, b) => doctorOf(a).localeCompare(doctorOf(b)) || a.name.localeCompare(b.name));
  const tables: ReportTable[] = [];
  if (current.length) {
    tables.push({
      heading: "Current medicines",
      columns: ["Medicine", "Strength & schedule", "Until", "For", "Prescribed by"],
      widths: [1.5, 1.3, 0.8, 1.1, 1.2],
      rows: current.map((m) => ({
        cells: [nameCell(m), howCell(m), plain(m.endDate ? formatDate(m.endDate, timeZone) : "Continue"), plain(m.condition ?? ""), plain(doctorOf(m))],
      })),
    });
  }
  if (endedMedications.length) {
    tables.push({
      heading: "Stopped or finished in this period",
      columns: ["Medicine", "Strength & schedule", "Ended", "Why", "Prescribed by"],
      widths: [1.5, 1.3, 0.8, 1.1, 1.2],
      rows: endedMedications.map((m) => ({
        cells: [
          nameCell(m),
          howCell(m),
          plain(formatDate((m.stoppedAt ?? m.endDate)!, timeZone)),
          plain(m.stoppedAt ? m.stopReason || "Stopped" : "Course finished"),
          plain(doctorOf(m)),
        ],
      })),
    });
  }
  return { title: "Medication List", emptyMessage: tables.length ? undefined : "No medicines recorded for this period.", tables };
}

import "server-only";
import { siteConfig } from "@/config/site";
import { GENDER_LABELS, TIME_OF_DAY_LABELS } from "@/domain/enums";
import { bpCategoryLabel } from "@/domain/blood-pressure";
import { dualUnitLabel, formatGlucoseDual, formatGlucoseRangeDual } from "@/domain/glucose";
import type { Insight } from "@/domain/insights";
import type { Severity } from "@/domain/severity";
import type { NumberStats } from "@/domain/stats";
import { ageFrom, formatDate, formatDateTime } from "@/lib/dates";
import type { HealthData } from "@/server/services/health-data.service";
import { dailyBloodPressureTable, dailyGlucoseTable } from "./daily-log";

/**
 * Format-agnostic report model. Every generator (PDF, DOCX, CSV) renders
 * these same rows, so labels, rounding and classification are defined once.
 */
export interface ReportTable {
  title: string;
  /** "summary" tables go on the overview pages; "detail" tables (the daily logs) go in the appendix. */
  kind: "summary" | "detail";
  columns: string[];
  /** Relative column widths (defaults to equal). */
  widths?: number[];
  /** Index of the column coloured by row severity. */
  statusColumn?: number;
  /** `cellSeverity` colours individual cells (daily logs); it wins over `severity` + `statusColumn`. */
  rows: { cells: string[]; severity?: Severity; cellSeverity?: (Severity | undefined)[] }[];
  /** Notes printed under the table, referenced by "*" in cells. */
  footnotes?: string[];
}

/** Severity to colour cell `i` with, if any (normal readings stay uncoloured). */
export function cellSeverityOf(table: ReportTable, row: ReportTable["rows"][number], i: number): Severity | undefined {
  const severity = row.cellSeverity ? row.cellSeverity[i] : i === table.statusColumn ? row.severity : undefined;
  return severity && severity !== "normal" ? severity : undefined;
}

export interface ReportSectionModel {
  title: string;
  keyFacts: { label: string; value: string }[];
  tables: ReportTable[];
  insights: Insight[];
  emptyMessage?: string;
}

export interface ReportModel {
  title: string;
  appName: string;
  generatedAt: string;
  periodLabel: string;
  patient: { label: string; value: string }[];
  sections: ReportSectionModel[];
  disclaimer: string;
}

const dash = "-";
const fmt = (n: number | null | undefined, suffix = "") => (n == null ? dash : `${Math.round(n)}${suffix}`);

export function buildReportModel(data: HealthData, timeZone: string, generatedAt = new Date()): ReportModel {
  const { profile, range } = data;
  const lastDay = new Date(range.to.getTime() - 1);
  const age = ageFrom(profile.dateOfBirth);

  const sections: ReportSectionModel[] = [];
  if (data.sections.bp) sections.push(bpSection(data, timeZone));
  if (data.sections.glucose) sections.push(glucoseSection(data, timeZone));
  if (data.sections.medications) sections.push(medicationSection(data));

  return {
    title: "Blood Pressure & Glucose Report",
    appName: siteConfig.name,
    generatedAt: formatDateTime(generatedAt, timeZone),
    periodLabel: `${formatDate(range.from, timeZone)} - ${formatDate(lastDay, timeZone)}`,
    patient: [
      { label: "Patient", value: profile.name },
      { label: "Age", value: age != null ? `${age} years` : dash },
      { label: "Gender", value: profile.gender ? GENDER_LABELS[profile.gender] : dash },
      { label: "BP target", value: `< ${profile.bpSystolicTarget}/${profile.bpDiastolicTarget} mmHg` },
      {
        label: "Glucose target",
        value: `${formatGlucoseRangeDual(profile.glucoseLow, profile.glucoseFastingMax, profile.glucoseUnit)} fasting, < ${formatGlucoseDual(profile.glucosePostMealMax, profile.glucoseUnit)} after meals`,
      },
    ],
    sections,
    disclaimer: siteConfig.disclaimer,
  };
}

function bpSection({ bp }: HealthData, tz: string): ReportSectionModel {
  const s = bp.summary;
  const avg = s.systolic.avg != null ? `${fmt(s.systolic.avg)}/${fmt(s.diastolic.avg)} mmHg` : dash;
  // A real reading (highest systolic), not max systolic + max diastolic from different readings.
  const highest = bp.readings.reduce<(typeof bp.readings)[number] | null>((top, r) => (!top || r.systolic > top.systolic ? r : top), null);
  return {
    title: "Blood pressure",
    emptyMessage: s.count === 0 ? "No blood pressure readings in this period." : undefined,
    keyFacts: [
      { label: "Readings", value: String(s.count) },
      { label: "Average", value: avg },
      { label: "Highest", value: highest ? `${highest.systolic}/${highest.diastolic}` : dash },
      { label: "Avg pulse", value: fmt(s.pulse.avg, " bpm") },
      { label: "On target", value: s.onTargetPct != null ? `${s.onTargetPct}%` : dash },
    ],
    insights: bp.insights,
    tables:
      s.count === 0
        ? []
        : [
            {
              title: "Averages by time of day",
              kind: "summary",
              columns: ["Time of day", "Readings", "Avg systolic", "Avg diastolic"],
              rows: s.byTimeOfDay.map((p) => ({
                cells: [TIME_OF_DAY_LABELS[p.timeOfDay], String(p.count), fmt(p.systolicAvg), fmt(p.diastolicAvg)],
              })),
            },
            {
              title: "Classification (ACC/AHA)",
              kind: "summary",
              columns: ["Category", "Readings", "Share"],
              statusColumn: 0,
              rows: s.categories.map((c) => ({
                cells: [bpCategoryLabel(c.category), String(c.count), `${Math.round((c.count / s.count) * 100)}%`],
                severity: classifyCategorySeverity(c.category),
              })),
            },
            dailyBloodPressureTable(bp.readings, tz),
          ],
  };
}

function classifyCategorySeverity(category: Parameters<typeof bpCategoryLabel>[0]): Severity {
  const map = { LOW: "low", NORMAL: "normal", ELEVATED: "elevated", STAGE_1: "high", STAGE_2: "high", CRISIS: "critical" } as const;
  return map[category];
}

function glucoseSection({ glucose, profile }: HealthData, tz: string): ReportSectionModel {
  const s = glucose.summary;
  const unit = profile.glucoseUnit;
  const g = (stats: NumberStats) => (stats.avg == null ? dash : `${formatGlucoseDual(stats.avg, unit, true)} n=${stats.count}`);
  return {
    title: "Blood glucose",
    emptyMessage: s.count === 0 ? "No glucose readings in this period." : undefined,
    keyFacts: [
      { label: "Readings", value: String(s.count) },
      { label: "Average", value: s.overall.avg != null ? formatGlucoseDual(s.overall.avg, unit) : dash },
      { label: "Range", value: s.overall.min != null ? formatGlucoseRangeDual(s.overall.min, s.overall.max!, unit) : dash },
      { label: "In target", value: s.inRangePct != null ? `${s.inRangePct}%` : dash },
      { label: "Low episodes", value: String(s.lowCount) },
      { label: "Est. A1C", value: s.estimatedA1c != null ? `${s.estimatedA1c}%` : "Needs 10+ readings" },
    ],
    insights: glucose.insights,
    tables:
      s.count === 0
        ? []
        : [
            {
              title: `Average by time of day & meal - ${dualUnitLabel(unit)}`,
              kind: "summary",
              columns: ["Time of day", "Before meal / fasting", "After meal", "Other"],
              rows: s.slots.map((slot) => ({
                cells: [TIME_OF_DAY_LABELS[slot.timeOfDay], g(slot.before), g(slot.after), g(slot.other)],
              })),
            },
            dailyGlucoseTable(glucose.readings, tz, unit, glucose.targets),
          ],
  };
}

function medicationSection({ medications }: HealthData): ReportSectionModel {
  return {
    title: "Current medications",
    emptyMessage: medications.length === 0 ? "No active medications recorded." : undefined,
    keyFacts: [],
    insights: [],
    tables:
      medications.length === 0
        ? []
        : [
            {
              title: "Active medications",
              kind: "summary",
              columns: ["Medication", "Dosage", "Schedule", "Notes"],
              rows: medications.map((m) => ({ cells: [m.name, m.dosage, m.schedule, m.notes ?? ""] })),
            },
          ],
  };
}

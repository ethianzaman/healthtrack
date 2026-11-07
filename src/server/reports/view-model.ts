import "server-only";
import { siteConfig } from "@/config/site";
import { ARM_LABELS, GENDER_LABELS, MEAL_TIMING_LABELS, TIME_OF_DAY_LABELS } from "@/domain/enums";
import { bpCategoryLabel, classifyBloodPressure } from "@/domain/blood-pressure";
import { classifyGlucose, formatGlucose, glucoseCategoryLabel } from "@/domain/glucose";
import type { Insight } from "@/domain/insights";
import type { Severity } from "@/domain/severity";
import type { NumberStats } from "@/domain/stats";
import { ageFrom, formatDate, formatDateTime, formatTime } from "@/lib/dates";
import type { HealthData } from "@/server/services/health-data.service";

/**
 * Format-agnostic report model. Every generator (PDF, DOCX, CSV) renders
 * these same rows, so labels, rounding and classification are defined once.
 */
export interface ReportTable {
  title: string;
  /** "summary" tables go on the overview pages; "detail" tables (every reading) go in the appendix. */
  kind: "summary" | "detail";
  columns: string[];
  /** Relative column widths (defaults to equal). */
  widths?: number[];
  /** Index of the column coloured by row severity. */
  statusColumn?: number;
  rows: { cells: string[]; severity?: Severity }[];
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
        value: `${formatGlucose(profile.glucoseLow, profile.glucoseUnit, false)}-${formatGlucose(profile.glucoseFastingMax, profile.glucoseUnit)} fasting, < ${formatGlucose(profile.glucosePostMealMax, profile.glucoseUnit)} after meals`,
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
            {
              title: "Blood pressure readings",
              kind: "detail",
              columns: ["Date", "Time", "Period", "BP (mmHg)", "Pulse", "Arm", "Category", "Note"],
              widths: [1.2, 0.9, 0.9, 0.9, 0.6, 0.8, 1.6, 1.6],
              statusColumn: 6,
              rows: bp.readings.map((r) => {
                const c = classifyBloodPressure(r.systolic, r.diastolic);
                return {
                  severity: c.severity,
                  cells: [
                    formatDate(r.measuredAt, tz),
                    formatTime(r.measuredAt, tz),
                    TIME_OF_DAY_LABELS[r.timeOfDay],
                    `${r.systolic}/${r.diastolic}`,
                    r.pulse != null ? String(r.pulse) : dash,
                    r.arm ? ARM_LABELS[r.arm] : dash,
                    c.label,
                    r.note ?? "",
                  ],
                };
              }),
            },
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
  const g = (stats: NumberStats) => (stats.avg == null ? dash : `${formatGlucose(stats.avg, unit, false)} (n=${stats.count})`);
  return {
    title: "Blood glucose",
    emptyMessage: s.count === 0 ? "No glucose readings in this period." : undefined,
    keyFacts: [
      { label: "Readings", value: String(s.count) },
      { label: "Average", value: s.overall.avg != null ? formatGlucose(s.overall.avg, unit) : dash },
      { label: "Range", value: s.overall.min != null ? `${formatGlucose(s.overall.min, unit, false)}-${formatGlucose(s.overall.max!, unit)}` : dash },
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
              title: `Average by time of day & meal (${unit === "MMOL_L" ? "mmol/L" : "mg/dL"})`,
              kind: "summary",
              columns: ["Time of day", "Before meal / fasting", "After meal", "Other"],
              rows: s.slots.map((slot) => ({
                cells: [TIME_OF_DAY_LABELS[slot.timeOfDay], g(slot.before), g(slot.after), g(slot.other)],
              })),
            },
            {
              title: "Glucose readings",
              kind: "detail",
              columns: ["Date", "Time", "Period", "Meal", "Glucose", "Status", "Note"],
              widths: [1.2, 0.9, 0.9, 1.2, 1.1, 0.9, 1.6],
              statusColumn: 5,
              rows: glucose.readings.map((r) => {
                const c = classifyGlucose(r.valueMgDl, r.mealTiming, glucose.targets);
                return {
                  severity: c.severity,
                  cells: [
                    formatDate(r.measuredAt, tz),
                    formatTime(r.measuredAt, tz),
                    TIME_OF_DAY_LABELS[r.timeOfDay],
                    MEAL_TIMING_LABELS[r.mealTiming],
                    formatGlucose(r.valueMgDl, unit),
                    glucoseCategoryLabel(c.category),
                    r.note ?? "",
                  ],
                };
              }),
            },
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

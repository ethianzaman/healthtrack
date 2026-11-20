import { BP_CATEGORY_ORDER, classifyBloodPressure } from "@/domain/blood-pressure";
import { MealTiming, TIME_OF_DAY_LABELS, TimeOfDay, type Arm } from "@/domain/enums";
import { classifyGlucose, formatGlucoseDual, formatGlucoseRangeDual, GLUCOSE_CATEGORY_ORDER, type GlucoseTargets } from "@/domain/glucose";
import { BP_STATUS, BP_STATUS_LEGEND, GLUCOSE_STATUS, glucoseStatusLegend } from "@/domain/report-status";
import type { Severity } from "@/domain/severity";
import { formatDate, formatTime, toZonedYmd } from "@/lib/dates";
import type { BpReportColumn, GlucoseReportColumn } from "@/features/reports/schemas";
import type { CellLine } from "./cells";
import type { ReportRow, ReportTable } from "./view-model";

/**
 * Daily report tables: one row per date. Each time-slot column holds that day's readings
 * (value with the time in small print), and one Status column sums the day up with the
 * worst reading's status. Pure and format-agnostic: PDF and DOCX render the same rows.
 */

interface BpReading {
  measuredAt: Date;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  arm: Arm | null;
  timeOfDay: TimeOfDay;
  note: string | null;
}

interface GlucoseReading {
  measuredAt: Date;
  valueMgDl: number;
  mealTiming: MealTiming;
  timeOfDay: TimeOfDay;
  note: string | null;
}

/** One reading as shown in its slot, plus what it contributes to the day's status. */
interface Entry {
  line: CellLine;
  severity: Severity;
  status: string;
  /** Tie-breaker between equal severities (e.g. stage 2 beats stage 1). */
  rank: number;
}

const SEVERITY_RANK: Record<Severity, number> = { normal: 0, low: 1, elevated: 2, high: 3, critical: 4 };
const worse = (a: Entry | undefined, b: Entry) =>
  !a || SEVERITY_RANK[b.severity] > SEVERITY_RANK[a.severity] || (SEVERITY_RANK[b.severity] === SEVERITY_RANK[a.severity] && b.rank > a.rank) ? b : a;

const dateCell = (d: Date, timeZone: string): CellLine[] => [
  { text: formatDate(d, timeZone), note: new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short" }).format(d) },
];

function dailyRows<R extends { measuredAt: Date; note: string | null }, K extends string>(o: {
  readings: R[];
  timeZone: string;
  slots: { key: K; label: string }[];
  slotOf: (r: R) => K;
  describe: (r: R) => Entry;
  withStatus: boolean;
  withNotes: boolean;
  slotWidth: number;
}): Pick<ReportTable, "columns" | "widths" | "rows" | "statusColumn"> {
  const used = o.slots.filter((s) => o.readings.some((r) => o.slotOf(r) === s.key));
  const labelOf = new Map(o.slots.map((s) => [s.key, s.label]));
  const days = new Map<string, R[]>();
  for (const r of [...o.readings].sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime())) {
    const key = toZonedYmd(r.measuredAt, o.timeZone);
    days.set(key, [...(days.get(key) ?? []), r]);
  }

  const rows: ReportRow[] = [...days.values()].map((day) => {
    const cells: CellLine[][] = [dateCell(day[0].measuredAt, o.timeZone)];
    const cellSeverity: (Severity | undefined)[] = [undefined];
    let dayWorst: Entry | undefined;
    for (const slot of used) {
      const entries = day.filter((r) => o.slotOf(r) === slot.key).map(o.describe);
      const slotWorst = entries.reduce<Entry | undefined>(worse, undefined);
      if (slotWorst) dayWorst = worse(dayWorst, slotWorst);
      cells.push(entries.length ? entries.map((e) => e.line) : [{ text: "-" }]);
      cellSeverity.push(slotWorst?.severity);
    }
    if (o.withStatus) {
      cells.push([{ text: dayWorst?.status ?? "-" }]);
      cellSeverity.push(undefined);
    }
    if (o.withNotes) {
      const notes = day.filter((r) => r.note?.trim()).map((r) => ({ text: r.note!.trim(), note: labelOf.get(o.slotOf(r)) }));
      cells.push(notes.length ? notes : [{ text: "" }]);
      cellSeverity.push(undefined);
    }
    return { cells, cellSeverity, severity: dayWorst?.severity };
  });

  const columns = ["Date", ...used.map((s) => s.label), ...(o.withStatus ? ["Status"] : []), ...(o.withNotes ? ["Note"] : [])];
  return {
    columns,
    widths: [1, ...used.map(() => o.slotWidth), ...(o.withStatus ? [1] : []), ...(o.withNotes ? [1.3] : [])],
    statusColumn: o.withStatus ? 1 + used.length : undefined,
    rows,
  };
}

const BP_SLOTS = [TimeOfDay.MORNING, TimeOfDay.AFTERNOON, TimeOfDay.EVENING, TimeOfDay.NIGHT].map((t) => ({ key: t, label: TIME_OF_DAY_LABELS[t] }));

export function dailyBloodPressureTable(readings: BpReading[], timeZone: string, columns: readonly BpReportColumn[]): ReportTable {
  const show = (c: BpReportColumn) => columns.includes(c);
  const table = dailyRows({
    readings,
    timeZone,
    slots: BP_SLOTS,
    slotOf: (r) => r.timeOfDay,
    withStatus: show("status"),
    withNotes: show("note"),
    slotWidth: 1.25,
    describe: (r) => {
      const c = classifyBloodPressure(r.systolic, r.diastolic);
      const note = [
        show("time") ? formatTime(r.measuredAt, timeZone) : "",
        show("pulse") && r.pulse != null ? `${r.pulse} bpm` : "",
        show("arm") && r.arm ? (r.arm === "LEFT" ? "left arm" : "right arm") : "",
      ]
        .filter(Boolean)
        .join(" · ");
      return { line: { text: `${r.systolic}/${r.diastolic} mmHg`, note: note || undefined }, severity: c.severity, status: BP_STATUS[c.category], rank: BP_CATEGORY_ORDER.indexOf(c.category) };
    },
  });
  return { ...table, footnotes: show("status") ? [BP_STATUS_LEGEND] : [] };
}

type Meal = "breakfast" | "lunch" | "dinner";
type GlucoseSlot = "fasting" | `${"before" | "after"}-${Meal}` | "bedtime" | "random";
const MEAL_OF: Record<TimeOfDay, Meal> = { MORNING: "breakfast", AFTERNOON: "lunch", EVENING: "dinner", NIGHT: "dinner" };

const GLUCOSE_SLOTS: { key: GlucoseSlot; label: string }[] = [
  { key: "fasting", label: "Fasting" },
  { key: "before-breakfast", label: "Before breakfast" },
  { key: "after-breakfast", label: "2h after breakfast" },
  { key: "before-lunch", label: "Before lunch" },
  { key: "after-lunch", label: "2h after lunch" },
  { key: "before-dinner", label: "Before dinner" },
  { key: "after-dinner", label: "2h after dinner" },
  { key: "bedtime", label: "Bedtime" },
  { key: "random", label: "Random" },
];

/** Meal timing + time of day -> the column a glucose reading belongs in. */
export function glucoseSlotOf(r: Pick<GlucoseReading, "mealTiming" | "timeOfDay">): GlucoseSlot {
  switch (r.mealTiming) {
    case MealTiming.FASTING:
      return "fasting";
    case MealTiming.BEDTIME:
      return "bedtime";
    case MealTiming.RANDOM:
      return "random";
    case MealTiming.BEFORE_MEAL:
      return `before-${MEAL_OF[r.timeOfDay]}`;
    case MealTiming.AFTER_MEAL:
      return `after-${MEAL_OF[r.timeOfDay]}`;
  }
}

/** Danger-low and danger-high both outrank plain low/high when picking the day's status. */
const GLUCOSE_RANK: Record<(typeof GLUCOSE_CATEGORY_ORDER)[number], number> = { IN_RANGE: 0, LOW: 1, HIGH: 2, VERY_HIGH: 3, VERY_LOW: 4 };

export function dailyGlucoseTable(readings: GlucoseReading[], timeZone: string, targets: GlucoseTargets, columns: readonly GlucoseReportColumn[]): ReportTable {
  const show = (c: GlucoseReportColumn) => columns.includes(c);
  const table = dailyRows({
    readings,
    timeZone,
    slots: GLUCOSE_SLOTS,
    slotOf: glucoseSlotOf,
    withStatus: show("status"),
    withNotes: show("note"),
    slotWidth: 1.45,
    describe: (r) => {
      const c = classifyGlucose(r.valueMgDl, r.mealTiming, targets);
      return {
        line: { text: formatGlucoseDual(r.valueMgDl), note: show("time") ? formatTime(r.measuredAt, timeZone) : undefined },
        severity: c.severity,
        status: GLUCOSE_STATUS[c.category],
        rank: GLUCOSE_RANK[c.category],
      };
    },
  });
  return {
    ...table,
    footnotes: show("status")
      ? [
          glucoseStatusLegend({
            normalBeforeMeals: formatGlucoseRangeDual(targets.low, targets.fastingMax),
            postMealMax: formatGlucoseDual(targets.postMealMax),
            low: formatGlucoseDual(targets.low),
          }),
        ]
      : [],
  };
}

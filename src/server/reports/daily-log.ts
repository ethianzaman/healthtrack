import { classifyBloodPressure } from "@/domain/blood-pressure";
import { MealTiming, TIME_OF_DAY_LABELS, TimeOfDay, type GlucoseUnit } from "@/domain/enums";
import { classifyGlucose, dualUnitLabel, formatGlucoseDual, type GlucoseTargets } from "@/domain/glucose";
import type { Severity } from "@/domain/severity";
import { toZonedYmd } from "@/lib/dates";
import type { ReportTable } from "./view-model";

/**
 * Pivots individual readings into one row per day (morning, evening ... side by side),
 * which is how doctors scan a logbook. Pure and format-agnostic: PDF and DOCX render it.
 */

interface BpReading {
  measuredAt: Date;
  systolic: number;
  diastolic: number;
  pulse: number | null;
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

type Row = ReportTable["rows"][number];

const dash = "-";
const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

function dayLabel(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "2-digit", month: "short" }).format(date);
}

/** Groups readings by local calendar day, oldest first. */
function byDay<T extends { measuredAt: Date }>(readings: T[], timeZone: string) {
  const days = new Map<string, { label: string; readings: T[] }>();
  for (const r of [...readings].sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime())) {
    const key = toZonedYmd(r.measuredAt, timeZone);
    const day = days.get(key) ?? { label: dayLabel(r.measuredAt, timeZone), readings: [] };
    day.readings.push(r);
    days.set(key, day);
  }
  return [...days.values()];
}

/** Builds one row-per-day table from column definitions; columns nobody used are dropped. */
function pivot<T extends { measuredAt: Date; note: string | null }, K extends string>(opts: {
  readings: T[];
  timeZone: string;
  columns: { key: K; label: string }[];
  columnOf: (r: T) => K;
  render: (group: T[], key: K) => { text: string; severity?: Severity };
  extra?: { label: string; render: (day: T[]) => string };
}): Pick<ReportTable, "columns" | "widths" | "rows" | "footnotes"> {
  const used = opts.columns.filter((c) => opts.readings.some((r) => opts.columnOf(r) === c.key));
  const footnotes: string[] = [];
  const rows: Row[] = byDay(opts.readings, opts.timeZone).map((day) => {
    const cells = [day.label];
    const cellSeverity: (Severity | undefined)[] = [undefined];
    for (const col of used) {
      const group = day.readings.filter((r) => opts.columnOf(r) === col.key);
      if (group.length === 0) {
        cells.push(dash);
        cellSeverity.push(undefined);
        continue;
      }
      const { text, severity } = opts.render(group, col.key);
      const notes = group.map((r) => r.note?.trim()).filter(Boolean);
      notes.forEach((n) => footnotes.push(`${day.label}, ${col.label}: ${n}`));
      cells.push(notes.length ? `${text}*` : text);
      cellSeverity.push(severity);
    }
    if (opts.extra) {
      cells.push(opts.extra.render(day.readings));
      cellSeverity.push(undefined);
    }
    return { cells, cellSeverity };
  });

  const columns = ["Date", ...used.map((c) => c.label), ...(opts.extra ? [opts.extra.label] : [])];
  return { columns, widths: [1.3, ...columns.slice(1).map(() => 1)], rows, footnotes };
}

const countHint = (n: number) => (n > 1 ? ` (avg of ${n})` : "");

const BP_COLUMNS = [TimeOfDay.MORNING, TimeOfDay.AFTERNOON, TimeOfDay.EVENING, TimeOfDay.NIGHT].map((t) => ({
  key: t,
  label: TIME_OF_DAY_LABELS[t],
}));

export function dailyBloodPressureTable(readings: BpReading[], timeZone: string): ReportTable {
  const hasPulse = readings.some((r) => r.pulse != null);
  return {
    title: "Daily blood pressure log (mmHg)",
    kind: "detail",
    ...pivot({
      readings,
      timeZone,
      columns: BP_COLUMNS,
      columnOf: (r) => r.timeOfDay,
      render: (group) => {
        const sys = Math.round(avg(group.map((r) => r.systolic)));
        const dia = Math.round(avg(group.map((r) => r.diastolic)));
        return { text: `${sys}/${dia}${countHint(group.length)}`, severity: classifyBloodPressure(sys, dia).severity };
      },
      extra: hasPulse
        ? {
            label: "Pulse (avg)",
            render: (day) => {
              const pulses = day.map((r) => r.pulse).filter((p): p is number => p != null);
              return pulses.length ? String(Math.round(avg(pulses))) : dash;
            },
          }
        : undefined,
    }),
  };
}

type MealName = "breakfast" | "lunch" | "dinner";
type GlucoseColumn = "fasting" | `${"before" | "after"}-${MealName}` | "bedtime" | "random";

const MEAL_OF: Record<TimeOfDay, MealName> = { MORNING: "breakfast", AFTERNOON: "lunch", EVENING: "dinner", NIGHT: "dinner" };

const GLUCOSE_COLUMNS: { key: GlucoseColumn; label: string; timing: MealTiming }[] = [
  { key: "fasting", label: "Fasting", timing: MealTiming.FASTING },
  { key: "before-breakfast", label: "Before breakfast", timing: MealTiming.BEFORE_MEAL },
  { key: "after-breakfast", label: "After breakfast", timing: MealTiming.AFTER_MEAL },
  { key: "before-lunch", label: "Before lunch", timing: MealTiming.BEFORE_MEAL },
  { key: "after-lunch", label: "After lunch", timing: MealTiming.AFTER_MEAL },
  { key: "before-dinner", label: "Before dinner", timing: MealTiming.BEFORE_MEAL },
  { key: "after-dinner", label: "After dinner", timing: MealTiming.AFTER_MEAL },
  { key: "bedtime", label: "Bedtime", timing: MealTiming.BEDTIME },
  { key: "random", label: "Random", timing: MealTiming.RANDOM },
];

function glucoseColumnOf(r: GlucoseReading): GlucoseColumn {
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

export function dailyGlucoseTable(readings: GlucoseReading[], timeZone: string, unit: GlucoseUnit, targets: GlucoseTargets): ReportTable {
  const timingOf = new Map(GLUCOSE_COLUMNS.map((c) => [c.key, c.timing]));
  return {
    title: `Daily glucose log - ${dualUnitLabel(unit)}`,
    kind: "detail",
    ...pivot({
      readings,
      timeZone,
      columns: GLUCOSE_COLUMNS,
      columnOf: glucoseColumnOf,
      render: (group, key) => {
        const value = avg(group.map((r) => r.valueMgDl));
        return {
          text: `${formatGlucoseDual(value, unit, true)}${countHint(group.length)}`,
          severity: classifyGlucose(value, timingOf.get(key)!, targets).severity,
        };
      },
    }),
  };
}

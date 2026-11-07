import type { GlucoseUnit } from "@/domain/enums";
import { fromMgDl } from "@/domain/glucose";
import { mealGroupOf } from "@/domain/summary";
import { round } from "@/domain/stats";
import type { TrendPoint } from "@/components/charts/trend-chart";
import { formatShortDate, formatTime } from "./dates";

interface BpLike {
  systolic: number;
  diastolic: number;
  pulse: number | null;
  measuredAt: Date;
}

interface GlucoseLike {
  valueMgDl: number;
  mealTiming: Parameters<typeof mealGroupOf>[0];
  measuredAt: Date;
}

const pointLabel = (d: Date, tz: string) => `${formatShortDate(d, tz)} ${formatTime(d, tz)}`;

/** Readings must be sorted ascending by measuredAt. */
export function bpTrendData(readings: BpLike[], tz: string): TrendPoint[] {
  return readings.map((r) => ({
    label: pointLabel(r.measuredAt, tz),
    systolic: r.systolic,
    diastolic: r.diastolic,
    pulse: r.pulse,
  }));
}

/** Splits glucose into before-meal and after-meal series for a clearer picture. */
export function glucoseTrendData(readings: GlucoseLike[], unit: GlucoseUnit, tz: string): TrendPoint[] {
  return readings.map((r) => {
    const value = round(fromMgDl(r.valueMgDl, unit), unit === "MMOL_L" ? 1 : 0);
    const group = mealGroupOf(r.mealTiming);
    return {
      label: pointLabel(r.measuredAt, tz),
      before: group === "BEFORE" ? value : null,
      after: group === "AFTER" ? value : null,
      other: group === "OTHER" ? value : null,
    };
  });
}

export const BP_SERIES = [
  { key: "systolic", label: "Systolic", color: "#0f766e" },
  { key: "diastolic", label: "Diastolic", color: "#64748b" },
];

export const GLUCOSE_SERIES = [
  { key: "before", label: "Fasting / before meal", color: "#0f766e" },
  { key: "after", label: "After meal", color: "#ea580c" },
  { key: "other", label: "Bedtime / random", color: "#1d4ed8" },
];

/**
 * Aggregations shared by the dashboard, reports and doctor share page.
 * Pure functions over plain reading shapes, so they are trivially testable.
 */
import { BP_CATEGORY_ORDER, classifyBloodPressure, isBpOnTarget, type BpCategory } from "./blood-pressure";
import { TIME_OF_DAY_VALUES, type MealTiming, type TimeOfDay } from "./enums";
import {
  classifyGlucose,
  estimateA1c,
  GLUCOSE_CATEGORY_ORDER,
  type GlucoseCategory,
  type GlucoseTargets,
} from "./glucose";
import { countBy, groupBy, numberStats, percentage, type NumberStats } from "./stats";

export interface BpReadingLike {
  systolic: number;
  diastolic: number;
  pulse: number | null;
  timeOfDay: TimeOfDay;
  measuredAt: Date;
}

export interface GlucoseReadingLike {
  valueMgDl: number;
  timeOfDay: TimeOfDay;
  mealTiming: MealTiming;
  measuredAt: Date;
}

// ---- Blood pressure ------------------------------------------------------

export interface BpPeriodStats {
  timeOfDay: TimeOfDay;
  count: number;
  systolicAvg: number | null;
  diastolicAvg: number | null;
}

export interface BpSummary {
  count: number;
  systolic: NumberStats;
  diastolic: NumberStats;
  pulse: NumberStats;
  byTimeOfDay: BpPeriodStats[];
  categories: { category: BpCategory; count: number }[];
  onTargetPct: number | null;
  worstCategory: BpCategory | null;
}

export function summarizeBloodPressure(
  readings: BpReadingLike[],
  target: { systolic: number; diastolic: number },
): BpSummary {
  const grouped = groupBy(readings, (r) => r.timeOfDay);
  const categoryCounts = countBy(readings, (r) => classifyBloodPressure(r.systolic, r.diastolic).category);
  const categories = BP_CATEGORY_ORDER.filter((c) => categoryCounts[c]).map((category) => ({
    category,
    count: categoryCounts[category]!,
  }));
  const worst = [...categories].sort(
    (a, b) => riskRank(b.category) - riskRank(a.category),
  )[0]?.category;

  return {
    count: readings.length,
    systolic: numberStats(readings.map((r) => r.systolic)),
    diastolic: numberStats(readings.map((r) => r.diastolic)),
    pulse: numberStats(readings.flatMap((r) => (r.pulse == null ? [] : [r.pulse]))),
    byTimeOfDay: TIME_OF_DAY_VALUES.filter((t) => grouped[t]?.length).map((timeOfDay) => {
      const items = grouped[timeOfDay]!;
      return {
        timeOfDay,
        count: items.length,
        systolicAvg: numberStats(items.map((r) => r.systolic)).avg,
        diastolicAvg: numberStats(items.map((r) => r.diastolic)).avg,
      };
    }),
    categories,
    onTargetPct: percentage(readings, (r) => isBpOnTarget(r.systolic, r.diastolic, target)),
    worstCategory: worst ?? null,
  };
}

/** LOW is clinically relevant but ranked below hypertension stages. */
function riskRank(category: BpCategory) {
  const rank: Record<BpCategory, number> = { NORMAL: 0, LOW: 1, ELEVATED: 2, STAGE_1: 3, STAGE_2: 4, CRISIS: 5 };
  return rank[category];
}

// ---- Glucose -------------------------------------------------------------

export type MealGroup = "BEFORE" | "AFTER" | "OTHER";

export function mealGroupOf(mealTiming: MealTiming): MealGroup {
  if (mealTiming === "FASTING" || mealTiming === "BEFORE_MEAL") return "BEFORE";
  if (mealTiming === "AFTER_MEAL") return "AFTER";
  return "OTHER";
}

export interface GlucoseSlotStats {
  timeOfDay: TimeOfDay;
  before: NumberStats;
  after: NumberStats;
  other: NumberStats;
}

export interface GlucoseSummary {
  count: number;
  overall: NumberStats;
  /** Morning/afternoon/evening/night x before/after meal - the core view for diabetes care. */
  slots: GlucoseSlotStats[];
  categories: { category: GlucoseCategory; count: number }[];
  inRangePct: number | null;
  lowCount: number;
  estimatedA1c: number | null;
}

export function summarizeGlucose(readings: GlucoseReadingLike[], targets: GlucoseTargets): GlucoseSummary {
  const classify = (r: GlucoseReadingLike) => classifyGlucose(r.valueMgDl, r.mealTiming, targets).category;
  const categoryCounts = countBy(readings, classify);
  const overall = numberStats(readings.map((r) => r.valueMgDl));
  const byTime = groupBy(readings, (r) => r.timeOfDay);

  const statsFor = (items: GlucoseReadingLike[], group: MealGroup) =>
    numberStats(items.filter((r) => mealGroupOf(r.mealTiming) === group).map((r) => r.valueMgDl));

  return {
    count: readings.length,
    overall,
    slots: TIME_OF_DAY_VALUES.filter((t) => byTime[t]?.length).map((timeOfDay) => {
      const items = byTime[timeOfDay]!;
      return {
        timeOfDay,
        before: statsFor(items, "BEFORE"),
        after: statsFor(items, "AFTER"),
        other: statsFor(items, "OTHER"),
      };
    }),
    categories: GLUCOSE_CATEGORY_ORDER.filter((c) => categoryCounts[c]).map((category) => ({
      category,
      count: categoryCounts[category]!,
    })),
    inRangePct: percentage(readings, (r) => classify(r) === "IN_RANGE"),
    lowCount: (categoryCounts.LOW ?? 0) + (categoryCounts.VERY_LOW ?? 0),
    // Needs a reasonable sample to mean anything.
    estimatedA1c: overall.avg != null && readings.length >= 10 ? estimateA1c(overall.avg) : null,
  };
}

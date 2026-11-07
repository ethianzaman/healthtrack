import { GlucoseUnit, MealTiming } from "./enums";
import type { Classification } from "./severity";

export type GlucoseCategory = "VERY_LOW" | "LOW" | "IN_RANGE" | "HIGH" | "VERY_HIGH";

export interface GlucoseTargets {
  low: number; // mg/dL - below is hypoglycaemia
  fastingMax: number; // mg/dL - upper target fasting / before meal
  postMealMax: number; // mg/dL - upper target 1-2h after a meal
}

/** ADA general adult targets; profiles can override them. */
export const DEFAULT_GLUCOSE_TARGETS: GlucoseTargets = { low: 70, fastingMax: 130, postMealMax: 180 };

const VERY_LOW_MG_DL = 54;
const VERY_HIGH_MG_DL = 250;
const MG_DL_PER_MMOL_L = 18.0182;

export const GLUCOSE_LIMITS_MG_DL = { min: 10, max: 900 } as const;

const GLUCOSE_CLASSES: Record<GlucoseCategory, Omit<Classification<GlucoseCategory>, "category">> = {
  VERY_LOW: { label: "Very low", severity: "critical" },
  LOW: { label: "Low", severity: "low" },
  IN_RANGE: { label: "In range", severity: "normal" },
  HIGH: { label: "High", severity: "high" },
  VERY_HIGH: { label: "Very high", severity: "critical" },
};

export const GLUCOSE_CATEGORY_ORDER: GlucoseCategory[] = ["VERY_LOW", "LOW", "IN_RANGE", "HIGH", "VERY_HIGH"];

/** Fasting & pre-meal readings use the tighter target; everything else the post-meal one. */
export function upperTargetFor(mealTiming: MealTiming, targets: GlucoseTargets) {
  return mealTiming === MealTiming.FASTING || mealTiming === MealTiming.BEFORE_MEAL
    ? targets.fastingMax
    : targets.postMealMax;
}

export function classifyGlucose(
  valueMgDl: number,
  mealTiming: MealTiming,
  targets: GlucoseTargets = DEFAULT_GLUCOSE_TARGETS,
): Classification<GlucoseCategory> {
  const category = resolveCategory(valueMgDl, upperTargetFor(mealTiming, targets), targets.low);
  return { category, ...GLUCOSE_CLASSES[category] };
}

function resolveCategory(value: number, upper: number, low: number): GlucoseCategory {
  if (value < VERY_LOW_MG_DL) return "VERY_LOW";
  if (value < low) return "LOW";
  if (value > VERY_HIGH_MG_DL) return "VERY_HIGH";
  if (value > upper) return "HIGH";
  return "IN_RANGE";
}

export function glucoseCategoryLabel(category: GlucoseCategory) {
  return GLUCOSE_CLASSES[category].label;
}

// ---- Units -------------------------------------------------------------

export function toMgDl(value: number, unit: GlucoseUnit) {
  return unit === GlucoseUnit.MMOL_L ? value * MG_DL_PER_MMOL_L : value;
}

export function fromMgDl(valueMgDl: number, unit: GlucoseUnit) {
  return unit === GlucoseUnit.MMOL_L ? valueMgDl / MG_DL_PER_MMOL_L : valueMgDl;
}

/** Display a stored mg/dL value in the profile's preferred unit. */
export function formatGlucose(valueMgDl: number, unit: GlucoseUnit, withUnit = true) {
  const value = fromMgDl(valueMgDl, unit);
  const text = unit === GlucoseUnit.MMOL_L ? value.toFixed(1) : Math.round(value).toString();
  return withUnit ? `${text} ${unit === GlucoseUnit.MMOL_L ? "mmol/L" : "mg/dL"}` : text;
}

/**
 * Estimated A1C from average glucose (ADAG formula, Nathan et al. 2008).
 * Indicative only - meaningful with several weeks of regular readings.
 */
export function estimateA1c(averageMgDl: number) {
  return Math.round(((averageMgDl + 46.7) / 28.7) * 10) / 10;
}

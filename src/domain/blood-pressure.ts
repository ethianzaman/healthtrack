import type { Classification } from "./severity";

export type BpCategory =
  | "LOW"
  | "NORMAL"
  | "ELEVATED"
  | "STAGE_1"
  | "STAGE_2"
  | "CRISIS";

const BP_CLASSES: Record<BpCategory, Omit<Classification<BpCategory>, "category">> = {
  LOW: { label: "Low", severity: "low" },
  NORMAL: { label: "Normal", severity: "normal" },
  ELEVATED: { label: "Elevated", severity: "elevated" },
  STAGE_1: { label: "Hypertension stage 1", severity: "high" },
  STAGE_2: { label: "Hypertension stage 2", severity: "high" },
  CRISIS: { label: "Hypertensive crisis", severity: "critical" },
};

export const BP_CATEGORY_ORDER: BpCategory[] = [
  "LOW",
  "NORMAL",
  "ELEVATED",
  "STAGE_1",
  "STAGE_2",
  "CRISIS",
];

export const BP_LIMITS = {
  systolic: { min: 50, max: 300 },
  diastolic: { min: 30, max: 200 },
  pulse: { min: 30, max: 250 },
} as const;

/**
 * Classify a reading using the 2017 ACC/AHA guideline.
 * The higher-risk of the systolic/diastolic categories wins.
 */
export function classifyBloodPressure(systolic: number, diastolic: number): Classification<BpCategory> {
  const category = resolveCategory(systolic, diastolic);
  return { category, ...BP_CLASSES[category] };
}

function resolveCategory(sys: number, dia: number): BpCategory {
  if (sys > 180 || dia > 120) return "CRISIS";
  if (sys >= 140 || dia >= 90) return "STAGE_2";
  if (sys >= 130 || dia >= 80) return "STAGE_1";
  if (sys >= 120) return "ELEVATED";
  if (sys < 90 || dia < 60) return "LOW";
  return "NORMAL";
}

export function bpCategoryLabel(category: BpCategory) {
  return BP_CLASSES[category].label;
}

/** Whether the reading meets the patient's personal target. */
export function isBpOnTarget(
  systolic: number,
  diastolic: number,
  target: { systolic: number; diastolic: number },
) {
  return systolic < target.systolic && diastolic < target.diastolic && systolic >= 90 && diastolic >= 60;
}

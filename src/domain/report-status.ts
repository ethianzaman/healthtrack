import type { BpCategory } from "./blood-pressure";
import type { GlucoseCategory } from "./glucose";

/**
 * Plain-language status words for reports, mapped from the standard categories:
 * blood pressure per ACC/AHA 2017, glucose per ADA (hypoglycaemia levels) and the
 * profile's own targets. "DANGER" marks the levels that need urgent attention.
 */

export const BP_STATUS: Record<BpCategory, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  ELEVATED: "Elevated",
  STAGE_1: "High (stage 1)",
  STAGE_2: "High (stage 2)",
  CRISIS: "DANGER (crisis)",
};

export const GLUCOSE_STATUS: Record<GlucoseCategory, string> = {
  VERY_LOW: "DANGER (very low)",
  LOW: "Low",
  IN_RANGE: "Normal",
  HIGH: "High",
  VERY_HIGH: "DANGER (very high)",
};

export const BP_STATUS_LEGEND =
  "Status (ACC/AHA 2017): Normal below 120/80 · Elevated 120-129/below 80 · High stage 1 130-139 or 80-89 · High stage 2 140+ or 90+ · DANGER (crisis) above 180 or above 120 · Low below 90/60.";

/** Targets arrive pre-formatted in both units, e.g. "3.9-7.2 mmol/L or 70-130 mg/dL". */
export function glucoseStatusLegend(t: { normalBeforeMeals: string; postMealMax: string; low: string }) {
  return `Status (ADA and this patient's targets): Normal ${t.normalBeforeMeals} before meals and below ${t.postMealMax} after meals · Low below ${t.low} · DANGER (very low) below 3.0 mmol/L or 54 mg/dL · High above target · DANGER (very high) above 13.9 mmol/L or 250 mg/dL.`;
}

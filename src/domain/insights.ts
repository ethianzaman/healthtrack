/**
 * Rule-based, plain-language insights generated from summaries.
 * Deliberately conservative: observations, never diagnoses.
 */
import type { Severity } from "./severity";
import type { BpSummary, GlucoseSummary } from "./summary";
import { TIME_OF_DAY_LABELS } from "./enums";
import type { GlucoseTargets } from "./glucose";

export interface Insight {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
}

const MIN_SAMPLE = 3;

export function bloodPressureInsights(s: BpSummary): Insight[] {
  const out: Insight[] = [];
  if (s.count < MIN_SAMPLE) return out;

  const crisis = s.categories.find((c) => c.category === "CRISIS")?.count ?? 0;
  if (crisis > 0) {
    out.push({
      id: "bp-crisis",
      severity: "critical",
      title: `${crisis} reading${crisis > 1 ? "s" : ""} above 180/120`,
      detail: "Readings in the hypertensive crisis range need prompt medical attention.",
    });
  }

  const morning = s.byTimeOfDay.find((p) => p.timeOfDay === "MORNING");
  const evening = s.byTimeOfDay.find((p) => p.timeOfDay === "EVENING");
  if (morning?.systolicAvg != null && evening?.systolicAvg != null && morning.count >= 2 && evening.count >= 2) {
    const diff = Math.round(morning.systolicAvg - evening.systolicAvg);
    if (Math.abs(diff) >= 10) {
      const higher = diff > 0 ? "MORNING" : "EVENING";
      out.push({
        id: "bp-morning-evening",
        severity: "elevated",
        title: `${TIME_OF_DAY_LABELS[higher]} systolic is ${Math.abs(diff)} mmHg higher`,
        detail:
          "A consistent gap between morning and evening pressure is worth discussing with your doctor (e.g. medication timing).",
      });
    }
  }

  if (s.onTargetPct != null) {
    out.push({
      id: "bp-on-target",
      severity: s.onTargetPct >= 70 ? "normal" : s.onTargetPct >= 40 ? "elevated" : "high",
      title: `${s.onTargetPct}% of readings on target`,
      detail: "Share of readings below your personal blood pressure target.",
    });
  }
  return out;
}

export function glucoseInsights(s: GlucoseSummary, targets: GlucoseTargets): Insight[] {
  const out: Insight[] = [];
  if (s.count < MIN_SAMPLE) return out;

  if (s.lowCount > 0) {
    out.push({
      id: "glucose-lows",
      severity: "critical",
      title: `${s.lowCount} low glucose reading${s.lowCount > 1 ? "s" : ""}`,
      detail: "Hypoglycaemia episodes should be reviewed with your doctor, especially if they repeat.",
    });
  }

  const highAfterMeal = s.slots
    .filter((slot) => slot.after.avg != null && slot.after.count >= 2 && slot.after.avg > targets.postMealMax)
    .map((slot) => TIME_OF_DAY_LABELS[slot.timeOfDay].toLowerCase());
  if (highAfterMeal.length > 0) {
    out.push({
      id: "glucose-post-meal",
      severity: "high",
      title: `After-meal glucose is high in the ${highAfterMeal.join(" & ")}`,
      detail: `Average post-meal readings are above your ${targets.postMealMax} mg/dL target for these meals.`,
    });
  }

  if (s.inRangePct != null) {
    out.push({
      id: "glucose-in-range",
      severity: s.inRangePct >= 70 ? "normal" : s.inRangePct >= 50 ? "elevated" : "high",
      title: `${s.inRangePct}% of readings in target range`,
      detail: "Aim for at least 70% of readings in your target range.",
    });
  }
  return out;
}

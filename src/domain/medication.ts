/**
 * Medication course rules shared by forms, lists and reports: preset choices, course
 * status (active / completed / stopped) and same-ingredient detection.
 */

export const DOSAGE_FORMS = ["Tablet", "Capsule", "Syrup", "Suspension", "Injection", "Insulin", "Drops", "Inhaler", "Cream", "Ointment", "Sachet", "Suppository", "Other"] as const;

export const STRENGTH_PRESETS = ["2.5 mg", "5 mg", "10 mg", "20 mg", "25 mg", "40 mg", "50 mg", "100 mg", "250 mg", "500 mg", "850 mg", "1000 mg"] as const;

/** Common "morning + noon + night" patterns. Numbers are how many to take each time, so "2+0+2" = two at a time. */
export const SCHEDULE_PRESETS = ["1+0+0", "0+1+0", "0+0+1", "1+0+1", "1+1+1", "1+1+1+1", "½+0+½", "2+0+2"] as const;

export const MEAL_TIMINGS = ["BEFORE_MEAL", "AFTER_MEAL", "WITH_MEAL", "EMPTY_STOMACH", "ANY_TIME"] as const;
export type MedicationMealTiming = (typeof MEAL_TIMINGS)[number];
export const MEAL_TIMING_TEXT: Record<MedicationMealTiming, string> = {
  BEFORE_MEAL: "Before meal",
  AFTER_MEAL: "After meal",
  WITH_MEAL: "With meal",
  EMPTY_STOMACH: "Empty stomach",
  ANY_TIME: "Any time",
};

/** Course lengths offered as one tap; `null` = continue until a doctor stops it. */
export const DURATION_PRESETS: { label: string; days: number | null }[] = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "1 month", days: 30 },
  { label: "3 months", days: 90 },
  { label: "Continue", days: null },
];

const DAY_MS = 86_400_000;

export function courseEnd(start: Date, days: number | null | undefined): Date | null {
  return days ? new Date(start.getTime() + days * DAY_MS) : null;
}

export type MedicationStatus = "ACTIVE" | "COMPLETED" | "STOPPED";

/** Stopped early beats completed; a course whose end date has passed is completed. */
export function medicationStatus(m: { active: boolean; endDate: Date | null }, now = new Date()): MedicationStatus {
  if (!m.active) return "STOPPED";
  if (m.endDate && m.endDate.getTime() <= now.getTime()) return "COMPLETED";
  return "ACTIVE";
}

export const MEDICATION_STATUS_TEXT: Record<MedicationStatus, string> = { ACTIVE: "Active", COMPLETED: "Completed", STOPPED: "Stopped" };

/**
 * Active ingredients of a generic name, normalised for comparison:
 * "Hydrochlorothiazide + Losartan Potassium" -> ["hydrochlorothiazide", "losartan"].
 * Salts are dropped (first word only); vitamins keep two words so B12 and D3 stay distinct.
 */
export function ingredientsOf(generic: string | null | undefined): string[] {
  if (!generic) return [];
  return generic
    .split("+")
    .map((part) => part.trim().toLowerCase().split(/\s+/))
    .filter((words) => words[0])
    .map((words) => (words[0] === "vitamin" && words[1] ? `vitamin ${words[1]}` : words[0]));
}

/** Ingredients the new medicine shares with medicines already being taken. */
export function sharedIngredients(generic: string | null | undefined, current: { generic: string | null }[]): string[] {
  const mine = new Set(ingredientsOf(generic));
  return [...new Set(current.flatMap((c) => ingredientsOf(c.generic)).filter((i) => mine.has(i)))];
}

/** Course length shown in the form: null -> "Continue", 30 -> "1 month", 45 -> "45 days". */
export function formatDuration(days: number | null | undefined): string {
  if (days == null) return "Continue";
  if (days % 30 === 0 && days <= 360) return days === 30 ? "1 month" : `${days / 30} months`;
  if (days % 7 === 0 && days <= 56 && days !== 7 && days !== 14) return `${days / 7} weeks`;
  return days === 1 ? "1 day" : `${days} days`;
}

/**
 * Typed course length -> days. "45", "10 days", "2 weeks", "3 months", "1 year" -> number;
 * "Continue" / "ongoing" / "lifelong" -> null; anything unreadable -> undefined.
 */
export function parseDuration(text: string): number | null | undefined {
  const t = text.trim().toLowerCase();
  if (!t || /^(continue|cont\.?|ongoing|lifelong|long term|regular)$/.test(t)) return null;
  const m = t.match(/^(\d{1,4})\s*(d|days?|w|wks?|weeks?|m|mo|months?|y|yrs?|years?)?$/);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (n < 1) return undefined;
  const unit = m[2] ?? "d";
  const days = unit.startsWith("w") ? n * 7 : unit.startsWith("y") ? n * 365 : unit === "d" || unit.startsWith("day") ? n : n * 30;
  return days > 3650 ? undefined : days;
}

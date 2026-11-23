/**
 * Health conditions (diagnoses) and how medicines/prescriptions relate to them.
 * Medicines keep the condition as text ("Hypertension, Type 2 diabetes"), so links are by name.
 */

export const CONDITION_STATUSES = ["ONGOING", "RESOLVED"] as const;
export type ConditionStatus = (typeof CONDITION_STATUSES)[number];
export const CONDITION_STATUS_TEXT: Record<ConditionStatus, string> = { ONGOING: "Ongoing", RESOLVED: "Resolved" };

/** Common names offered as suggestions; anything else can be typed. */
export const COMMON_CONDITIONS = [
  "Hypertension",
  "Type 2 diabetes",
  "Type 1 diabetes",
  "Prediabetes",
  "Dyslipidaemia (high cholesterol)",
  "Ischaemic heart disease",
  "Heart failure",
  "Atrial fibrillation",
  "Stroke",
  "Chronic kidney disease",
  "Hypothyroidism",
  "Hyperthyroidism",
  "Asthma",
  "COPD",
  "Gastritis / GERD",
  "Fatty liver",
  "Obesity",
  "Osteoarthritis",
  "Rheumatoid arthritis",
  "Osteoporosis",
  "Depression",
  "Anxiety",
] as const;

/** "Hypertension, Type 2 diabetes" / "HTN + DM" -> separate names, trimmed, duplicates removed. */
export function splitConditions(text: string | null | undefined): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  return text
    .split(/\s*(?:,|;|\+|&|\band\b)\s*/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Whether a medicine's condition text refers to this condition (exact name or one of the comma-separated parts). */
export function treats(medicineCondition: string | null | undefined, conditionName: string): boolean {
  const target = norm(conditionName);
  return splitConditions(medicineCondition).some((c) => norm(c) === target);
}

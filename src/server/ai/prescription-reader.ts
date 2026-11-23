/**
 * Reads a prescription photo with Google Gemini and turns the answer into the same draft the
 * on-device reader produces, so the review form doesn't care which one read it.
 * Pure apart from the injected fetch (testable without a key).
 */
import { DOSAGE_FORMS, MEAL_TIMINGS, type MedicationMealTiming } from "@/domain/medication";
import type { DraftMedication, PrescriptionDraft } from "@/domain/prescription";

export class AiReadError extends Error {
  constructor(
    message: string,
    /** "quota" = free limit reached, "unreadable" = no usable answer, "failed" = anything else. */
    readonly kind: "quota" | "unreadable" | "failed",
  ) {
    super(message);
  }
}

const PROMPT = `You read doctors' prescriptions from Bangladesh (printed or handwritten, English and/or Bangla) and return them as JSON.

Rules:
- Only report what is written. Never guess a medicine that isn't there. If a word is unreadable, give your best reading of the letters, not a different drug.
- name: the brand name as written, without the dosage form (write "Napa", not "Tab. Napa").
- form: Tablet, Capsule, Syrup, Suspension, Injection, Insulin, Drops, Inhaler, Cream, Ointment, Sachet, Suppository or Other (from "Tab", "Cap", "Syp", "Inj"...).
- strength: as written, e.g. "500 mg", "5/20 mg", "10 units". Empty if not written.
- schedule: morning+noon+night doses like "1+0+1" (also for "1-0-1", "১+০+১"). Four parts if four times a day ("1+1+1+1"). Convert Latin: OD/daily = "1+0+0", BD = "1+0+1", TDS = "1+1+1", QDS = "1+1+1+1", HS/at night = "0+0+1". Use "when needed" for SOS/PRN. Half tablets as "½".
- mealTiming: BEFORE_MEAL (before food, খাবারের আগে, a.c.), AFTER_MEAL (after food, খাবারের পরে, p.c.), WITH_MEAL, EMPTY_STOMACH (খালি পেটে), or ANY_TIME. Use UNKNOWN if not written.
- durationDays: course length in days ("7 days" = 7, "২ সপ্তাহ" = 14, "1 month"/"১ মাস" = 30). continues = true for "continue", "চলবে", "long term". Leave durationDays empty when not written.
- notes: short extra instruction for that medicine only (e.g. "2 puffs", "stop if dizzy"), else empty.
- doctorName: the doctor's name as printed on the pad, with "Dr." if present. doctorSpecialty: e.g. "Cardiologist", "Medicine Specialist", if printed.
- issuedOn: the prescription date as YYYY-MM-DD (dates are usually day/month/year). Empty if not found.
- conditions: diagnoses written (D/x, Dx, diagnosis, or complaints when no diagnosis), expanded: "HTN" = "Hypertension", "T2DM"/"DM" = "Type 2 diabetes", "IHD" = "Ischaemic heart disease", "CKD" = "Chronic kidney disease".
- Ignore tests/investigations, advice and follow-up dates; only medicines go in medications.
- readable = false if this is not a prescription or nothing can be read.`;

/** Answer shape Gemini must return (OpenAPI subset used by the Gemini API). */
export const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    readable: { type: "BOOLEAN" },
    doctorName: { type: "STRING" },
    doctorSpecialty: { type: "STRING" },
    issuedOn: { type: "STRING" },
    conditions: { type: "ARRAY", items: { type: "STRING" } },
    medications: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          form: { type: "STRING", enum: [...DOSAGE_FORMS] },
          name: { type: "STRING" },
          strength: { type: "STRING" },
          schedule: { type: "STRING" },
          mealTiming: { type: "STRING", enum: [...MEAL_TIMINGS, "UNKNOWN"] },
          durationDays: { type: "INTEGER", nullable: true },
          continues: { type: "BOOLEAN" },
          notes: { type: "STRING" },
        },
        required: ["name", "schedule"],
        propertyOrdering: ["form", "name", "strength", "schedule", "mealTiming", "durationDays", "continues", "notes"],
      },
    },
  },
  required: ["readable", "medications"],
  propertyOrdering: ["readable", "doctorName", "doctorSpecialty", "issuedOn", "conditions", "medications"],
} as const;

const BANGLA_DIGITS = "০১২৩৪৫৬৭৮৯";
const toAsciiDigits = (s: string) => s.replace(/[০-৯]/g, (d) => String(BANGLA_DIGITS.indexOf(d)));
const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const FORM_PREFIX = /^(?:tab(?:let)?s?|cap(?:sule)?s?|syr(?:up)?|syp|susp(?:ension)?|inj(?:ection)?|drops?|oint(?:ment)?|cream|sachet|inh(?:aler)?|supp)\b\.?\s*/i;

/** "1-0-1" / "১+০+১" / "1 + 0 + 1" -> "1+0+1"; other text kept as written. */
export function normaliseSchedule(raw: string): string {
  const s = toAsciiDigits(raw).replace(/1\/2/g, "½").trim();
  if (/^[0-2½](\s*[-+]\s*[0-2½]){2,3}$/.test(s)) return s.replace(/\s*[-+]\s*/g, "+");
  return s.slice(0, 120);
}

/** A yyyy-mm-dd date that exists and isn't in the future, else "". */
function validDate(raw: string, today = new Date()): string {
  const s = toAsciiDigits(raw);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return "";
  if (d.getTime() > today.getTime() + 86_400_000 || d.getUTCFullYear() < 1990) return "";
  return s;
}

/** Gemini's JSON (untrusted) -> a draft for the review form. Every field is checked and trimmed. */
export function draftFromAi(raw: unknown, today = new Date()): PrescriptionDraft {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const meds = Array.isArray(r.medications) ? r.medications : [];
  const medications: DraftMedication[] = [];
  for (const item of meds.slice(0, 20)) {
    const m = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const name = text(m.name, 100).replace(FORM_PREFIX, "").trim();
    if (!name) continue;
    const meal = text(m.mealTiming, 20) as MedicationMealTiming;
    const days = typeof m.durationDays === "number" && Number.isInteger(m.durationDays) && m.durationDays >= 1 && m.durationDays <= 3650 ? m.durationDays : undefined;
    const form = text(m.form, 40);
    medications.push({
      name,
      dosage: text(m.strength, 60),
      schedule: normaliseSchedule(text(m.schedule, 120)),
      mealTiming: (MEAL_TIMINGS as readonly string[]).includes(meal) ? meal : undefined,
      durationDays: m.continues === true ? null : days,
      notes: text(m.notes, 300),
      form: (DOSAGE_FORMS as readonly string[]).includes(form) ? form : undefined,
    });
  }
  const conditions = Array.isArray(r.conditions) ? [...new Set(r.conditions.map((c) => text(c, 80)).filter(Boolean))] : [];
  return {
    doctorName: text(r.doctorName, 120),
    doctorSpecialty: text(r.doctorSpecialty, 80) || undefined,
    issuedOn: validDate(text(r.issuedOn, 20), today),
    condition: conditions.join(", ").slice(0, 200),
    medications,
  };
}

/** Calls Gemini with the photo and returns the checked draft. */
export async function readPrescriptionWithGemini(
  image: { bytes: Uint8Array; mimeType: string },
  config: { apiKey: string; model: string },
  fetchImpl: typeof fetch = fetch,
): Promise<PrescriptionDraft> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`;
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": config.apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ inline_data: { mime_type: image.mimeType, data: Buffer.from(image.bytes).toString("base64") } }, { text: PROMPT }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new AiReadError("The reading service did not respond.", "failed");
  }
  if (res.status === 429) throw new AiReadError("Today's free AI reading limit is used up.", "quota");
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    throw new AiReadError(`Reading service error ${res.status}: ${detail}`, "failed");
  }
  const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
  const answer = (body.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
  let parsed: unknown;
  try {
    parsed = JSON.parse(answer);
  } catch {
    throw new AiReadError("The reading service gave no usable answer.", "unreadable");
  }
  if ((parsed as { readable?: unknown })?.readable === false) throw new AiReadError("This doesn't look like a readable prescription.", "unreadable");
  return draftFromAi(parsed);
}

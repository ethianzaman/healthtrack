import type { MedicationMealTiming } from "./medication";

/**
 * Turns raw OCR text from a prescription photo into a draft the user reviews.
 * Pure and dependency-free (runs in the browser next to the OCR engine).
 * It is a best-effort reader of common Bangladeshi/South-Asian prescription
 * conventions ("Tab. Napa 500mg", "1+0+1", "BD", "after meal", "7 days"), never
 * the final word: every field lands in an editable form before anything is saved.
 */

export interface DraftMedication {
  name: string;
  dosage: string;
  schedule: string;
  /** Before / after meal etc., when the prescription says so. */
  mealTiming?: MedicationMealTiming;
  /** Course length in days; null = "continue"; undefined = not written. */
  durationDays?: number | null;
  notes: string;
  /** Tablet, Capsule... and the generic name, when known (AI reading + DGDA match). */
  form?: string;
  generic?: string;
}

export interface PrescriptionDraft {
  doctorName: string;
  /** yyyy-mm-dd, or "" when not found. */
  issuedOn: string;
  condition: string;
  /** e.g. "Cardiologist", when the pad says so (AI reading). */
  doctorSpecialty?: string;
  medications: DraftMedication[];
}

/** Dosage forms that start a medicine line. */
const FORM = String.raw`(?:tab(?:let)?s?|cap(?:sule)?s?|syr(?:up)?|syp|susp(?:ension)?|inj(?:ection)?|drops?|oint(?:ment)?|cream|gel|sachet|inh(?:aler)?|neb(?:ulizer)?|supp)`;
const FORM_PREFIX = new RegExp(String.raw`^\s*(?:\d{1,2}\s*[.)]\s*)?(?:Rx\s*)?${FORM}\b\.?\s*`, "i");
const NUMBERED = /^\s*\d{1,2}\s*[.)]\s+(?=[A-Za-z])/;

const DOSE = /(\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g|gm|ml|iu|units?|%)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml))?)\b/i;
/** 1+0+1, 1-0-1, 1+1+1+1, ½+0+½ (OCR may read ½ as 1/2). */
const PLUS_SCHEDULE = /(?<![\d/.-])((?:[0-2]|½|1\/2)\s*[+\-]\s*(?:[0-2]|½|1\/2)\s*[+\-]\s*(?:[0-2]|½|1\/2)(?:\s*[+\-]\s*(?:[0-2]|½|1\/2))?)(?![\d/.])/;
const LATIN_SCHEDULE: [RegExp, string][] = [
  [/\b(?:q\.?i\.?d|qds)\b/i, "1+1+1+1"],
  [/\bt\.?d\.?s\b|\bt\.?i\.?d\b/i, "1+1+1"],
  [/\bb\.?d\b|\bb\.?i\.?d\b/i, "1+0+1"],
  [/\bh\.?s\b|\bat\s+(?:bed\s*time|night)\b/i, "0+0+1"],
  [/\bo\.?d\b|\bonce\s+(?:a\s+)?daily\b/i, "1+0+0"],
  [/\bs\.?o\.?s\b|\bp\.?r\.?n\b|\bif\s+needed\b/i, "when needed"],
];
const MEAL: [RegExp, MedicationMealTiming][] = [
  [/\b(?:after\s+(?:meals?|food|eating)|p\.?c\.?)\b/i, "AFTER_MEAL"],
  [/\b(?:before\s+(?:meals?|food|eating)|a\.?c\.?)\b/i, "BEFORE_MEAL"],
  [/\bempty\s+stomach\b/i, "EMPTY_STOMACH"],
  [/\bwith\s+(?:meals?|food)\b/i, "WITH_MEAL"],
];
const DURATION = /\b(\d{1,3})\s*(days?|d|weeks?|wks?|w|months?|mo)\b|\b(continue|cont\.?|ongoing)\b/i;

const DX_LABEL = /^\s*(?:d\s*\/\s*x|dx|diagnosis|diag\.?|impression|provisional\s+diagnosis)\s*[:\-–]?\s*/i;
const COMPLAINT_LABEL = /^\s*(?:c\s*\/\s*c|chief\s+complaints?)\s*[:\-–]?\s*/i;
/** Diagnosis wins; the complaint line is only a fallback. */
const DIAGNOSIS_LABEL = new RegExp(`${DX_LABEL.source}|${COMPLAINT_LABEL.source}`, "i");
/** Stays on one line, so the degrees line ("MBBS, FCPS") underneath is not swallowed. */
const DOCTOR = /\b(?:[Dd]r|[Pp]rof|[Aa]ssoc\.?[ \t]*[Pp]rof)\.?[ \t]+[A-Z][A-Za-z.]*(?:[ \t]+[A-Z][A-Za-z.]*){0,3}/;
const DATE = /\b(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{2,4})\b/;

/** Short forms doctors write, expanded so the condition reads plainly. */
const CONDITIONS: [RegExp, string][] = [
  [/\b(?:htn|hypertension|high\s+(?:blood\s+)?pressure)\b/i, "Hypertension"],
  [/\b(?:t2\s*dm|type\s*2\s*(?:dm|diabetes)|dm\s*(?:type\s*)?2)\b/i, "Type 2 diabetes"],
  [/\b(?:t1\s*dm|type\s*1\s*(?:dm|diabetes))\b/i, "Type 1 diabetes"],
  [/\b(?:dm|diabetes(?:\s+mellitus)?)\b/i, "Diabetes"],
  [/\b(?:ihd|cad|ischaemic\s+heart|ischemic\s+heart|coronary)\b/i, "Ischaemic heart disease"],
  [/\b(?:dyslipid(?:a)?emia|hyperlipid(?:a)?emia|high\s+cholesterol)\b/i, "Dyslipidaemia"],
  [/\b(?:ckd|chronic\s+kidney)\b/i, "Chronic kidney disease"],
  [/\b(?:hypothyroid(?:ism)?)\b/i, "Hypothyroidism"],
  [/\b(?:asthma|copd)\b/i, "Asthma / COPD"],
  [/\b(?:gerd|acid\s+peptic|apd|gastritis)\b/i, "Gastritis / GERD"],
];

/** Common brands seen without a "Tab." prefix (helps with sloppy OCR). Lower-case. */
const KNOWN_BRANDS = new Set([
  "napa", "ace", "seclo", "losectil", "maxpro", "sergel", "nexum", "pantonix", "esoral",
  "amdocal", "camlodin", "osartil", "losartan", "angilock", "bisocor", "bisoren", "concor", "nebicard", "betaloc",
  "metformin", "comet", "glucomet", "secrin", "amaryl", "diamicron", "linatab", "trajenta", "galvus", "sitaglip",
  "rosuva", "atova", "rovast", "ecosprin", "clopid", "thyrox", "monas", "fexo", "alatrol", "insulin", "mixtard",
]);

const clean = (s: string) => s.replace(/\s+/g, " ").replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, "");

function scheduleOf(text: string) {
  const plus = text.match(PLUS_SCHEDULE);
  if (plus) return plus[1].replace(/\s+/g, "").replace(/-/g, "+").replace(/1\/2/g, "½");
  return LATIN_SCHEDULE.find(([re]) => re.test(text))?.[1] ?? "";
}

function mealTimingOf(text: string): MedicationMealTiming | undefined {
  return MEAL.find(([re]) => re.test(text))?.[1];
}

/** "14 days" -> 14, "2 weeks" -> 14, "1 month" -> 30, "continue" -> null, nothing -> undefined. */
function durationDaysOf(text: string): number | null | undefined {
  const d = text.match(DURATION);
  if (!d) return undefined;
  if (d[3]) return null;
  const n = Number(d[1]);
  const unit = d[2].toLowerCase();
  return unit.startsWith("d") ? n : unit.startsWith("w") ? n * 7 : n * 30;
}

/** Whether a line carries dosing instructions (it then belongs to the medicine above it). */
const hasInstructions = (text: string) => Boolean(mealTimingOf(text)) || durationDaysOf(text) !== undefined;

function isMedicineStart(line: string) {
  if (FORM_PREFIX.test(line)) return true;
  const first = line.replace(NUMBERED, "").trim().split(/[\s.,]/)[0]?.toLowerCase() ?? "";
  return (NUMBERED.test(line) && (DOSE.test(line) || KNOWN_BRANDS.has(first))) || (KNOWN_BRANDS.has(first) && DOSE.test(line));
}

function medicineFrom(block: string[]): DraftMedication | null {
  const [first, ...rest] = block;
  const all = block.join(" ");
  const withoutPrefix = first.replace(FORM_PREFIX, "").replace(NUMBERED, "");
  const dose = withoutPrefix.match(DOSE)?.[1] ?? all.match(DOSE)?.[1] ?? "";
  // Name = text before the dose / schedule / first digit run on the first line.
  const cut = withoutPrefix.search(new RegExp(`${DOSE.source}|${PLUS_SCHEDULE.source}|\\d`, "i"));
  const name = clean(cut > 0 ? withoutPrefix.slice(0, cut) : withoutPrefix);
  if (name.length < 2 || !/[a-z]{2}/i.test(name)) return null;
  const formWord = first.match(new RegExp(`\\b${FORM}\\b`, "i"))?.[0];
  return {
    name: formWord ? `${capitalise(formWord.replace(/\.$/, ""))} ${capitaliseWords(name)}` : capitaliseWords(name),
    dosage: dose.replace(/\s+/g, " ").replace(/(\d)\s+(?=[a-z%])/i, "$1 ").trim(),
    schedule: scheduleOf(all),
    mealTiming: mealTimingOf(rest.length ? all : first),
    durationDays: durationDaysOf(rest.length ? all : first),
    notes: "",
  };
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
const capitaliseWords = (s: string) => s.split(" ").map((w) => (w.length > 3 || /^[a-z]+$/i.test(w) ? capitalise(w) : w)).join(" ");

function conditionFrom(lines: string[]) {
  const found: string[] = [];
  const labelled = lines.find((l) => DX_LABEL.test(l)) ?? lines.find((l) => COMPLAINT_LABEL.test(l));
  const haystack = labelled ? labelled.replace(DIAGNOSIS_LABEL, "") : lines.join(" ");
  for (const [re, label] of CONDITIONS) {
    if (re.test(haystack) && !found.some((f) => f.includes(label) || label.includes(f))) found.push(label);
  }
  // Keep the doctor's own wording when it isn't a known short form.
  if (!found.length && labelled) return clean(labelled.replace(DIAGNOSIS_LABEL, "")).slice(0, 120);
  return found.join(", ");
}

function dateFrom(text: string) {
  const m = text.match(DATE);
  if (!m) return "";
  const [, d, mo, y] = m.map(Number);
  const year = y < 100 ? 2000 + y : y;
  if (d < 1 || d > 31 || mo < 1 || mo > 12 || year < 2000 || year > 2100) return "";
  return `${year}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parsePrescriptionText(text: string): PrescriptionDraft {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/[|_~`]+/g, " ").trim())
    .filter((l) => l.length > 1);

  const blocks: string[][] = [];
  let current: string[] | null = null;
  for (const line of lines) {
    if (isMedicineStart(line)) {
      current = [line];
      blocks.push(current);
    } else if (current && current.length < 3 && (scheduleOf(line) || hasInstructions(line)) && !DIAGNOSIS_LABEL.test(line)) {
      // Instructions usually sit on the line(s) under the medicine name.
      current.push(line);
    } else {
      current = null;
    }
  }

  const medications = blocks.map(medicineFrom).filter((m): m is DraftMedication => m !== null);
  return {
    doctorName: clean(text.match(DOCTOR)?.[0] ?? ""),
    issuedOn: dateFrom(text),
    condition: conditionFrom(lines),
    medications,
  };
}

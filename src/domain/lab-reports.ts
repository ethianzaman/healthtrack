/**
 * Test report rules shared by the upload form, the upload route and the list page.
 */

/** Common tests in Bangladesh clinics, offered as suggestions (anything else can be typed). */
export const COMMON_TESTS = [
  "CBC (Complete blood count)",
  "HbA1c",
  "Fasting blood sugar (FBS)",
  "Blood sugar 2h after breakfast (2HABF)",
  "Random blood sugar (RBS)",
  "Lipid profile",
  "Serum creatinine",
  "eGFR",
  "SGPT (ALT)",
  "SGOT (AST)",
  "Serum electrolytes",
  "TSH",
  "Uric acid",
  "Urine R/M/E",
  "Urine ACR (microalbumin)",
  "ECG",
  "Echocardiogram",
  "Chest X-ray",
  "Ultrasound (USG) whole abdomen",
  "Vitamin D",
  "Hemoglobin",
  "ESR",
  "CRP",
  "Dengue NS1",
] as const;

export const LAB_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export type LabFileType = (typeof LAB_FILE_TYPES)[number];

/** Per file, after the browser has shrunk photos. Stays under Vercel's 4.5 MB request limit. */
export const LAB_FILE_MAX_BYTES = 4 * 1024 * 1024;
export const LAB_FILES_PER_REPORT = 20;
/** The small list preview made in the browser (about 480 px wide). */
export const LAB_THUMB_MAX_BYTES = 200 * 1024;
/** Bytes per stored chunk row. */
export const LAB_CHUNK_BYTES = 512 * 1024;

/**
 * The real type from the file's first bytes, so a renamed file can't pretend to be an image/PDF.
 * Returns null for anything that isn't JPEG, PNG, WebP or PDF.
 */
export function sniffFileType(bytes: Uint8Array): LabFileType | null {
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  if (starts(0x25, 0x50, 0x44, 0x46, 0x2d)) return "application/pdf";
  return null;
}

/** Splits bytes into fixed-size pieces for storage. */
export function chunkBytes(bytes: Uint8Array, size = LAB_CHUNK_BYTES): Uint8Array[] {
  const out: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i += size) out.push(bytes.subarray(i, i + size));
  return out.length ? out : [new Uint8Array()];
}

/** A safe display file name: no path, no control or quote characters, at most 120 chars. */
export function cleanFileName(name: string, type: LabFileType): string {
  const base = name.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f"<>|:*?]/g, "").trim() || "report";
  const ext = type === "application/pdf" ? ".pdf" : type === "image/png" ? ".png" : type === "image/webp" ? ".webp" : ".jpg";
  const stem = base.replace(/\.[a-z0-9]{1,5}$/i, "").slice(0, 110);
  return stem + ext;
}

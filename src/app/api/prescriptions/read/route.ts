import { type NextRequest } from "next/server";
import { getEnv } from "@/config/env";
import { sniffFileType } from "@/domain/lab-reports";
import type { PrescriptionDraft } from "@/domain/prescription";
import { AiReadError, readPrescriptionWithGemini } from "@/server/ai/prescription-reader";
import { getAppContext } from "@/server/auth/context";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { catalogRepository } from "@/server/repositories/catalog.repository";
import { assertRateLimit } from "@/server/security/rate-limit";

export const maxDuration = 60;

const fail = (error: string, status: number, kind = "failed") => Response.json({ error, kind }, { status });

/** Fills generic name and dosage form from the DGDA list when the brand matches exactly. */
async function withCatalog(draft: PrescriptionDraft): Promise<PrescriptionDraft> {
  const medications = await Promise.all(
    draft.medications.map(async (m) => {
      const matches = (await catalogRepository.search(m.name, 20)).filter((c) => c.brand.toLowerCase() === m.name.toLowerCase());
      const best = matches.find((c) => !m.form || c.form.toLowerCase().startsWith(m.form.toLowerCase())) ?? matches[0];
      return best ? { ...m, name: best.brand, generic: best.generic, form: m.form ?? best.form } : m;
    }),
  );
  return { ...draft, medications };
}

/**
 * Reads a prescription photo with Gemini and returns a draft for the user to check.
 * The photo is passed through to Google and not stored by us.
 */
export async function POST(request: NextRequest) {
  const ctx = await getAppContext();
  if (!ctx) return fail("Please sign in again.", 401);
  const { GEMINI_API_KEY, GEMINI_MODEL } = getEnv();
  if (!GEMINI_API_KEY) return fail("AI reading is not set up.", 503, "unavailable");
  try {
    assertRateLimit(`rx-read:${ctx.user.id}`, { limit: 15, windowMs: 60 * 60_000 });
  } catch (error) {
    if (error instanceof AppError) return fail("Too many scans this hour. Try again later, or type the medicines in.", 429, "quota");
    throw error;
  }

  let file: File | null = null;
  try {
    const value = (await request.formData()).get("image");
    file = value instanceof File ? value : null;
  } catch {
    return fail("Could not read the upload.", 400);
  }
  if (!file || file.size === 0) return fail("No photo was sent.", 400);
  if (file.size > 4 * 1024 * 1024) return fail("Photo is too large (max 4 MB).", 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffFileType(bytes);
  if (!type || type === "application/pdf") return fail("Please send a photo (JPG, PNG or WebP).", 415);

  try {
    const draft = await readPrescriptionWithGemini({ bytes, mimeType: type }, { apiKey: GEMINI_API_KEY, model: GEMINI_MODEL });
    return Response.json({ draft: await withCatalog(draft) });
  } catch (error) {
    if (error instanceof AiReadError) {
      if (error.kind === "failed") logger.error("AI prescription reading failed", { message: error.message });
      return fail(error.kind === "failed" ? "The AI reader is not available right now." : error.message, error.kind === "quota" ? 429 : 422, error.kind);
    }
    logger.error("AI prescription reading crashed", error);
    return fail("The AI reader is not available right now.", 502);
  }
}

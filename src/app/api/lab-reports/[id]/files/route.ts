import { type NextRequest } from "next/server";
import { cleanFileName, LAB_FILE_MAX_BYTES, LAB_FILES_PER_REPORT, LAB_THUMB_MAX_BYTES, sniffFileType } from "@/domain/lab-reports";
import { getAppContext } from "@/server/auth/context";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { labReportRepository } from "@/server/repositories/lab-report.repository";
import { assertRateLimit } from "@/server/security/rate-limit";
import { labFileService } from "@/server/services/lab-file.service";

const fail = (error: string, status: number) => Response.json({ error }, { status });

/**
 * Adds one photo or PDF (plus an optional small preview) to a test report of the signed-in
 * user's active profile. One file per request keeps each upload under the hosting limit (4.5 MB).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAppContext();
  if (!ctx) return fail("Please sign in again.", 401);
  try {
    assertRateLimit(`lab-upload:${ctx.user.id}`, { limit: 60, windowMs: 10 * 60_000 });
  } catch (error) {
    if (error instanceof AppError) return fail(error.message, 429);
    throw error;
  }

  const { id } = await params;
  const report = await labReportRepository.findForProfile(id, ctx.profile.id);
  if (!report) return fail("Test report not found.", 404);
  if (report._count.files >= LAB_FILES_PER_REPORT) return fail(`A report can have up to ${LAB_FILES_PER_REPORT} pages.`, 400);

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > LAB_FILE_MAX_BYTES + LAB_THUMB_MAX_BYTES + 64 * 1024) return fail("File is too large (max 4 MB).", 413);

  let file: File | null = null;
  let thumbFile: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get("file");
    const thumb = form.get("thumb");
    file = value instanceof File ? value : null;
    thumbFile = thumb instanceof File ? thumb : null;
  } catch {
    return fail("Could not read the upload.", 400);
  }
  if (!file || file.size === 0) return fail("No file was sent.", 400);
  if (file.size > LAB_FILE_MAX_BYTES) return fail("File is too large (max 4 MB).", 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffFileType(bytes);
  if (!type) return fail("Only photos (JPG, PNG, WebP) and PDF files can be added.", 415);

  // The preview is optional: a bad or oversized one is simply dropped.
  let thumb: Uint8Array | null = null;
  if (thumbFile && type !== "application/pdf" && thumbFile.size <= LAB_THUMB_MAX_BYTES) {
    const t = new Uint8Array(await thumbFile.arrayBuffer());
    if (sniffFileType(t) === "image/jpeg") thumb = t;
  }

  try {
    const saved = await labFileService.save({
      owner: { userId: ctx.user.id, profileId: ctx.profile.id },
      reportId: report.id,
      position: report._count.files,
      name: cleanFileName(file.name, type),
      type,
      bytes,
      thumb,
    });
    return Response.json({ id: saved.id }, { status: 201 });
  } catch (error) {
    logger.error("Test report upload failed", error);
    return fail("Could not store the file. Please try again.", 502);
  }
}

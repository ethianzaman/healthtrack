import { type NextRequest } from "next/server";
import { getAppContext } from "@/server/auth/context";
import { logger } from "@/server/logger";
import { labReportRepository } from "@/server/repositories/lab-report.repository";
import { labFileService } from "@/server/services/lab-file.service";

/**
 * A test report photo/PDF, only for the account that owns it.
 * `?thumb=1` gives the small preview (when there is one), `?download=1` saves instead of opening.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const ctx = await getAppContext();
  if (!ctx) return new Response("Unauthorized", { status: 401 });
  const { fileId } = await params;
  const file = await labReportRepository.findFileForUser(fileId, ctx.user.id);
  if (!file) return new Response("Not found", { status: 404 });
  const q = request.nextUrl.searchParams;
  try {
    return await labFileService.respond(file, { download: q.has("download"), thumb: q.has("thumb") });
  } catch (error) {
    logger.error("Test report file read failed", error);
    return new Response("Could not load the file", { status: 502 });
  }
}

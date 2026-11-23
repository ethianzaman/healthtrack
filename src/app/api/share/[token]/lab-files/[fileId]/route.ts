import { type NextRequest } from "next/server";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { labReportRepository } from "@/server/repositories/lab-report.repository";
import { assertRateLimit } from "@/server/security/rate-limit";
import { labFileService } from "@/server/services/lab-file.service";
import { shareService } from "@/server/services/share.service";

/** A test report file for a doctor holding a valid share link: only files of the shared profile. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string; fileId: string }> }) {
  const { token, fileId } = await params;
  const shared = await shareService.resolve(token);
  if (!shared) return new Response("Link is invalid or has expired", { status: 404 });
  try {
    assertRateLimit(`share-file:${shared.link.id}`, { limit: 120, windowMs: 60_000 });
  } catch (error) {
    if (error instanceof AppError) return new Response(error.message, { status: 429 });
    throw error;
  }
  const file = await labReportRepository.findFileForProfile(fileId, shared.profile.id);
  if (!file) return new Response("Not found", { status: 404 });
  const q = request.nextUrl.searchParams;
  try {
    return await labFileService.respond(file, { download: q.has("download"), thumb: q.has("thumb") });
  } catch (error) {
    logger.error("Shared test report file read failed", error);
    return new Response("Could not load the file", { status: 502 });
  }
}

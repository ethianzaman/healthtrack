import { type NextRequest } from "next/server";
import { parseReportQuery } from "@/features/reports/schemas";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { generateReport, reportResponse } from "@/server/reports/report.service";
import { assertRateLimit } from "@/server/security/rate-limit";
import { shareService } from "@/server/services/share.service";

/** Public PDF download for a doctor holding a valid share token. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await shareService.resolve(token);
  if (!shared) return Response.json({ error: "Link is invalid or has expired" }, { status: 404 });

  const parsed = parseReportQuery(request.nextUrl.searchParams);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  try {
    assertRateLimit(`share-report:${shared.link.id}`, { limit: 20, windowMs: 60_000 });
    // Share links always produce PDF regardless of the owner's plan.
    const report = await generateReport({ profile: shared.profile, query: { ...parsed.data, format: "pdf" }, timeZone: shared.timezone });
    return reportResponse(report);
  } catch (error) {
    if (error instanceof AppError) return Response.json({ error: error.message }, { status: error.status });
    logger.error("Shared report generation failed", error);
    return Response.json({ error: "Could not generate report" }, { status: 500 });
  }
}

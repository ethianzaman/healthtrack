import { type NextRequest } from "next/server";
import { parseReportQuery } from "@/features/reports/schemas";
import { getAppContext } from "@/server/auth/context";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { generateReport, reportResponse } from "@/server/reports/report.service";
import { assertRateLimit } from "@/server/security/rate-limit";

/** Errors go back to the form page (this endpoint is hit by a plain browser form). */
function backToForm(request: NextRequest, message: string) {
  const url = new URL("/reports", request.url);
  url.searchParams.set("error", message);
  return Response.redirect(url, 303);
}

export async function GET(request: NextRequest) {
  const ctx = await getAppContext();
  if (!ctx) return Response.redirect(new URL("/login", request.url), 303);

  const parsed = parseReportQuery(request.nextUrl.searchParams);
  if (!parsed.success) return backToForm(request, parsed.error.issues[0]?.message ?? "Invalid report options");

  try {
    assertRateLimit(`report:${ctx.user.id}`, { limit: 30, windowMs: 60_000 });
    const report = await generateReport({ profile: ctx.profile, query: parsed.data, timeZone: ctx.user.timezone, plan: ctx.user.plan });
    return reportResponse(report);
  } catch (error) {
    if (error instanceof AppError) return backToForm(request, error.message);
    logger.error("Report generation failed", error);
    return backToForm(request, "Could not generate the report. Please try again.");
  }
}

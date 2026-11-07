import "server-only";
import { planLimits } from "@/config/plans";
import type { Plan } from "@/domain/enums";
import type { Profile } from "@/generated/prisma/client";
import type { ReportFormat, ReportQuery } from "@/features/reports/schemas";
import { toZonedYmd, zonedDayRange } from "@/lib/dates";
import { AppError } from "@/server/errors";
import { loadHealthData } from "@/server/services/health-data.service";
import { csvGenerator } from "./generators/csv.generator";
import { docxGenerator } from "./generators/docx.generator";
import { pdfGenerator } from "./generators/pdf.generator";
import type { ReportGenerator } from "./types";
import { buildReportModel } from "./view-model";

const generators: Record<ReportFormat, ReportGenerator> = {
  pdf: pdfGenerator,
  docx: docxGenerator,
  csv: csvGenerator,
};

export interface GeneratedReport {
  body: Uint8Array | string;
  contentType: string;
  filename: string;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "patient";
}

export async function generateReport(params: {
  profile: Profile;
  query: ReportQuery;
  timeZone: string;
  plan?: Plan;
}): Promise<GeneratedReport> {
  const { profile, query, timeZone, plan } = params;
  if (plan && !planLimits(plan).reportFormats.includes(query.format)) {
    throw new AppError(`${query.format.toUpperCase()} export is available on the Pro plan.`, "PLAN_LIMIT");
  }

  const range = zonedDayRange(query.from, query.to, timeZone);
  const data = await loadHealthData(profile, range, {
    bp: query.sections.includes("bp"),
    glucose: query.sections.includes("glucose"),
    medications: query.sections.includes("medications"),
  });
  const generator = generators[query.format];
  const body = await generator.generate({ data, model: buildReportModel(data, timeZone), timeZone });

  return {
    body,
    contentType: generator.contentType,
    filename: `healthtrack-${slug(profile.name)}-${query.from}_to_${query.to}.${generator.extension}`,
  };
}

/** Shared HTTP response builder for report downloads. */
export function reportResponse(report: GeneratedReport) {
  const body = typeof report.body === "string" ? report.body : new Blob([report.body as BlobPart]);
  return new Response(body, {
    headers: {
      "Content-Type": report.contentType,
      "Content-Disposition": `attachment; filename="${report.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export function todayYmd(timeZone: string) {
  return toZonedYmd(new Date(), timeZone);
}

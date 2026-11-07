import type { ReportFormat } from "@/features/reports/schemas";
import type { HealthData } from "@/server/services/health-data.service";
import type { ReportModel } from "./view-model";

export interface ReportContext {
  data: HealthData;
  model: ReportModel;
  timeZone: string;
}

/** Strategy interface: add a new export format by implementing this and registering it. */
export interface ReportGenerator {
  format: ReportFormat;
  contentType: string;
  extension: string;
  generate(ctx: ReportContext): Promise<Uint8Array | string>;
}

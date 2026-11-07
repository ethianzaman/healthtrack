import "server-only";
import { bloodPressureInsights, glucoseInsights } from "@/domain/insights";
import { summarizeBloodPressure, summarizeGlucose } from "@/domain/summary";
import type { Profile } from "@/generated/prisma/client";
import { bloodPressureRepository, glucoseRepository } from "@/server/repositories/reading.repository";
import { medicationRepository } from "@/server/repositories/medication.repository";
import type { DateRange } from "@/server/repositories/shared";
import { bpTargetOf, glucoseTargetsOf } from "./profile.service";

export interface HealthSections {
  bp?: boolean;
  glucose?: boolean;
  medications?: boolean;
}

/**
 * Loads readings for a profile + range and computes summaries/insights.
 * Single implementation reused by dashboard, report generation and the doctor share page.
 */
export async function loadHealthData(profile: Profile, range: DateRange, sections: HealthSections = { bp: true, glucose: true, medications: true }) {
  const [bpReadings, glucoseReadings, medications] = await Promise.all([
    sections.bp ? bloodPressureRepository.list(profile.id, range, { order: "asc" }) : Promise.resolve([]),
    sections.glucose ? glucoseRepository.list(profile.id, range, { order: "asc" }) : Promise.resolve([]),
    sections.medications ? medicationRepository.list(profile.id, { activeOnly: true }) : Promise.resolve([]),
  ]);

  const bpSummary = summarizeBloodPressure(bpReadings, bpTargetOf(profile));
  const glucoseTargets = glucoseTargetsOf(profile);
  const glucoseSummary = summarizeGlucose(glucoseReadings, glucoseTargets);

  return {
    profile,
    range,
    sections,
    bp: { readings: bpReadings, summary: bpSummary, insights: bloodPressureInsights(bpSummary) },
    glucose: {
      readings: glucoseReadings,
      summary: glucoseSummary,
      targets: glucoseTargets,
      insights: glucoseInsights(glucoseSummary, glucoseTargets),
    },
    medications,
  };
}

export type HealthData = Awaited<ReturnType<typeof loadHealthData>>;

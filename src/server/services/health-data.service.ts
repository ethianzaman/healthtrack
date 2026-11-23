import "server-only";
import { bloodPressureInsights, glucoseInsights } from "@/domain/insights";
import { summarizeBloodPressure, summarizeGlucose } from "@/domain/summary";
import type { Profile } from "@/generated/prisma/client";
import { bloodPressureRepository, glucoseRepository } from "@/server/repositories/reading.repository";
import { conditionRepository } from "@/server/repositories/condition.repository";
import { labReportRepository } from "@/server/repositories/lab-report.repository";
import { medicationRepository } from "@/server/repositories/medication.repository";
import type { DateRange } from "@/server/repositories/shared";
import { medicationStatus } from "@/domain/medication";
import { bpTargetOf, glucoseTargetsOf } from "./profile.service";

export interface HealthSections {
  /** Conditions, current treatment and what changed in the period. */
  summary?: boolean;
  bp?: boolean;
  glucose?: boolean;
  medications?: boolean;
}

/**
 * Loads readings for a profile + range and computes summaries/insights.
 * Single implementation reused by dashboard, report generation and the doctor share page.
 */
export async function loadHealthData(profile: Profile, range: DateRange, sections: HealthSections = { bp: true, glucose: true, medications: true }) {
  const [bpReadings, glucoseReadings, medications, conditions, labReports] = await Promise.all([
    sections.bp ? bloodPressureRepository.list(profile.id, range, { order: "asc" }) : Promise.resolve([]),
    sections.glucose ? glucoseRepository.list(profile.id, range, { order: "asc" }) : Promise.resolve([]),
    sections.medications || sections.summary ? medicationRepository.list(profile.id) : Promise.resolve([]),
    sections.summary ? conditionRepository.list(profile.id) : Promise.resolve([]),
    sections.summary ? labReportRepository.list(profile.id, range) : Promise.resolve([]),
  ]);

  // Current = not stopped and course not finished; ended = stopped or finished inside the report period.
  const now = new Date();
  const currentMedications = medications.filter((m) => medicationStatus(m, now) === "ACTIVE");
  const endedMedications = medications.filter((m) => {
    if (medicationStatus(m, now) === "ACTIVE") return false;
    const ended = m.stoppedAt ?? m.endDate;
    return ended !== null && ended >= range.from && ended < range.to;
  });

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
    medications: currentMedications,
    /** Every medicine of the profile (for "started in this period" in the summary). */
    allMedications: medications,
    conditions,
    /** Tests done in the period (details only; the photos are not put in the report). */
    labReports,
    endedMedications,
  };
}

export type HealthData = Awaited<ReturnType<typeof loadHealthData>>;

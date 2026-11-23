"use server";

import { idSchema } from "@/features/shared/schemas";
import { protectedAction } from "@/server/actions/safe-action";
import { AppError, notFound } from "@/server/errors";
import { labReportRepository } from "@/server/repositories/lab-report.repository";
import { labFileService } from "@/server/services/lab-file.service";
import { activityService } from "@/server/services/activity.service";
import { labReportSchema, updateLabReportSchema, type LabReportInput } from "./schemas";

const revalidate = ["/test-reports", "/reports"];

/** Form values -> stored fields; a linked prescription must be this profile's own. */
async function toFields({ title, testDate, labName, prescriptionId, notes }: LabReportInput, profileId: string) {
  if (prescriptionId && !(await labReportRepository.ownsPrescription(prescriptionId, profileId))) {
    throw new AppError("That prescription was not found", "BAD_REQUEST");
  }
  return {
    title,
    testDate: testDate ? new Date(`${testDate}T00:00:00Z`) : null,
    labName: labName || null,
    prescriptionId: prescriptionId || null,
    notes: notes || null,
  };
}

/** Saves the details and returns the id; the browser then uploads each file to /api/lab-reports/{id}/files. */
export const createLabReport = protectedAction(
  labReportSchema,
  async (input, { profile }) => {
    const { id } = await labReportRepository.create(profile.id, await toFields(input, profile.id));
    // Only that a report was added, never the test name or results.
    await activityService.track("LAB_REPORT_SAVED", { userId: profile.userId });
    return { id };
  },
  { revalidate },
);

export const updateLabReport = protectedAction(
  updateLabReportSchema,
  async ({ id, ...input }, { profile }) => {
    if (!(await labReportRepository.updateForProfile(id, profile.id, await toFields(input, profile.id)))) throw notFound("Test report");
    return { id };
  },
  { revalidate, successMessage: "Test report updated" },
);

export const deleteLabReport = protectedAction(
  idSchema,
  async ({ id }, { profile }) => {
    const deleted = await labFileService.deleteWith({ reportId: id, profileId: profile.id }, () => labReportRepository.deleteForProfile(id, profile.id));
    if (!deleted) throw notFound("Test report");
    return null;
  },
  { revalidate, successMessage: "Test report deleted" },
);

export const deleteLabReportFile = protectedAction(
  idSchema,
  async ({ id }, { profile }) => {
    const deleted = await labFileService.deleteWith({ fileId: id, profileId: profile.id }, () => labReportRepository.deleteFileForProfile(id, profile.id));
    if (!deleted) throw notFound("File");
    return null;
  },
  { revalidate, successMessage: "Page removed" },
);

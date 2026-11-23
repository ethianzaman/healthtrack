"use server";

import { splitConditions } from "@/domain/conditions";
import { courseEnd } from "@/domain/medication";
import { idSchema } from "@/features/shared/schemas";
import { protectedAction } from "@/server/actions/safe-action";
import { notFound } from "@/server/errors";
import { conditionRepository } from "@/server/repositories/condition.repository";
import { medicationRepository } from "@/server/repositories/medication.repository";
import { prescriptionRepository } from "@/server/repositories/prescription.repository";
import { activityService } from "@/server/services/activity.service";
import { medicinesSchema, stopMedicationSchema, updateMedicationSchema, updatePrescriptionSchema } from "./schemas";

const revalidate = ["/medications", "/reports"];

/**
 * Saves one or more medicines. With any doctor detail they're grouped as a prescription
 * (so treatments from different doctors stay apart); otherwise they're saved on their own.
 */
export const saveMedicines = protectedAction(
  medicinesSchema,
  async ({ doctorName, doctorSpecialty, issuedOn, condition, medications }, { profile }) => {
    // Calendar date only, stored at UTC midnight; the course starts on the prescription date (or today).
    const start = issuedOn ? new Date(`${issuedOn}T00:00:00Z`) : new Date();
    const rows = medications.map(({ durationDays, dosage, notes, form, generic, mealTiming, ...m }) => ({
      ...m,
      dosage: dosage ?? "",
      notes: notes || null,
      form: form || null,
      generic: generic || null,
      mealTiming: mealTiming ?? null,
      condition: condition || null,
      startDate: start,
      endDate: courseEnd(start, durationDays),
    }));
    if (doctorName || doctorSpecialty || issuedOn || condition) {
      await prescriptionRepository.createWithMedications(profile.id, {
        doctorName: doctorName || null,
        doctorSpecialty: doctorSpecialty || null,
        issuedOn: issuedOn ? start : null,
        condition: condition || null,
        medications: rows,
      });
    } else {
      await medicationRepository.createMany(profile.id, rows);
    }
    // Conditions named here join the patient's condition list (if not there already).
    // "Since" only when the prescription has a date; otherwise unknown rather than "today".
    await conditionRepository.ensureByNames(profile.id, splitConditions(condition), issuedOn ? start : null, doctorName || null);
    // Only the count is tracked, never the medicine names.
    await activityService.track("PRESCRIPTION_SAVED", { userId: profile.userId, detail: `${rows.length} medicines` });
    return { added: rows.length };
  },
  { revalidate },
);

/** Corrects one medicine. Changing the start date or length moves the course end with it. */
export const updateMedication = protectedAction(
  updateMedicationSchema,
  async ({ id, startDate, durationDays, dosage, notes, form, generic, mealTiming, ...m }, { profile }) => {
    const existing = await medicationRepository.findForProfile(id, profile.id);
    if (!existing) throw notFound("Medication");
    const current = existing.startDate ?? existing.createdAt;
    // Same calendar day as before: keep the stored start exactly, so the course end doesn't shift by hours.
    const start = startDate && startDate !== current.toISOString().slice(0, 10) ? new Date(`${startDate}T00:00:00Z`) : current;
    await medicationRepository.updateForProfile(id, profile.id, {
      ...m,
      dosage: dosage ?? "",
      notes: notes || null,
      form: form || null,
      generic: generic || null,
      mealTiming: mealTiming ?? null,
      startDate: start,
      endDate: courseEnd(start, durationDays),
    });
    return null;
  },
  { revalidate, successMessage: "Medicine updated" },
);

/** Corrects the doctor details of a prescription; newly named conditions join the condition list. */
export const updatePrescription = protectedAction(
  updatePrescriptionSchema,
  async ({ id, doctorName, doctorSpecialty, issuedOn, condition }, { profile }) => {
    const date = issuedOn ? new Date(`${issuedOn}T00:00:00Z`) : null;
    const saved = await prescriptionRepository.updateForProfile(id, profile.id, {
      doctorName: doctorName || null,
      doctorSpecialty: doctorSpecialty || null,
      issuedOn: date,
      condition: condition || null,
    });
    if (!saved) throw notFound("Prescription");
    await conditionRepository.ensureByNames(profile.id, splitConditions(condition), date, doctorName || null);
    return null;
  },
  { revalidate: [...revalidate, "/conditions", "/test-reports"], successMessage: "Prescription updated" },
);

export const stopMedication = protectedAction(
  stopMedicationSchema,
  async ({ id, reason }, { profile }) => {
    if (!(await medicationRepository.updateForProfile(id, profile.id, { active: false, stoppedAt: new Date(), stopReason: reason || null }))) {
      throw notFound("Medication");
    }
    return null;
  },
  { revalidate, successMessage: "Medicine stopped" },
);

export const resumeMedication = protectedAction(
  idSchema,
  async ({ id }, { profile }) => {
    if (!(await medicationRepository.updateForProfile(id, profile.id, { active: true, stoppedAt: null, stopReason: null }))) throw notFound("Medication");
    return null;
  },
  { revalidate, successMessage: "Medicine resumed" },
);

export const deleteMedication = protectedAction(
  idSchema,
  async ({ id }, { profile }) => {
    if (!(await medicationRepository.deleteForProfile(id, profile.id))) throw notFound("Medication");
    return null;
  },
  { revalidate, successMessage: "Medicine removed" },
);

"use server";

import { toMgDl } from "@/domain/glucose";
import { protectedAction } from "@/server/actions/safe-action";
import { notFound } from "@/server/errors";
import { glucoseRepository } from "@/server/repositories/reading.repository";
import { idSchema } from "@/features/shared/schemas";
import { glucoseReadingSchema, updateGlucoseReadingSchema } from "./schemas";

const revalidate = ["/dashboard", "/glucose"];

export const addGlucoseReading = protectedAction(
  glucoseReadingSchema,
  async ({ value, unit, measuredAt, note, ...rest }, { profile }) => {
    await glucoseRepository.create(profile.id, {
      ...rest,
      // Always persist canonical mg/dL; convert on display.
      valueMgDl: Math.round(toMgDl(value, unit) * 10) / 10,
      measuredAt: new Date(measuredAt),
      note: note || null,
    });
    return null;
  },
  { revalidate, successMessage: "Glucose reading saved" },
);

export const updateGlucoseReading = protectedAction(
  updateGlucoseReadingSchema,
  async ({ id, value, unit, measuredAt, note, ...rest }, { profile }) => {
    const saved = await glucoseRepository.updateForProfile(id, profile.id, {
      ...rest,
      valueMgDl: Math.round(toMgDl(value, unit) * 10) / 10,
      measuredAt: new Date(measuredAt),
      note: note || null,
    });
    if (!saved) throw notFound("Reading");
    return null;
  },
  { revalidate, successMessage: "Reading updated" },
);

export const deleteGlucoseReading = protectedAction(
  idSchema,
  async ({ id }, { profile }) => {
    if (!(await glucoseRepository.deleteForProfile(id, profile.id))) throw notFound("Reading");
    return null;
  },
  { revalidate, successMessage: "Reading deleted" },
);

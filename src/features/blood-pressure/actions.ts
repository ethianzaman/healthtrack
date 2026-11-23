"use server";

import { protectedAction } from "@/server/actions/safe-action";
import { notFound } from "@/server/errors";
import { bloodPressureRepository } from "@/server/repositories/reading.repository";
import { idSchema } from "@/features/shared/schemas";
import { bpReadingSchema, updateBpReadingSchema } from "./schemas";

const revalidate = ["/dashboard", "/blood-pressure"];

export const addBpReading = protectedAction(
  bpReadingSchema,
  async ({ measuredAt, note, ...rest }, { profile }) => {
    await bloodPressureRepository.create(profile.id, {
      ...rest,
      measuredAt: new Date(measuredAt),
      note: note || null,
    });
    return null;
  },
  { revalidate, successMessage: "Blood pressure reading saved" },
);

export const updateBpReading = protectedAction(
  updateBpReadingSchema,
  async ({ id, measuredAt, note, pulse, arm, ...rest }, { profile }) => {
    const saved = await bloodPressureRepository.updateForProfile(id, profile.id, {
      ...rest,
      pulse: pulse ?? null,
      arm: arm ?? null,
      measuredAt: new Date(measuredAt),
      note: note || null,
    });
    if (!saved) throw notFound("Reading");
    return null;
  },
  { revalidate, successMessage: "Reading updated" },
);

export const deleteBpReading = protectedAction(
  idSchema,
  async ({ id }, { profile }) => {
    if (!(await bloodPressureRepository.deleteForProfile(id, profile.id))) throw notFound("Reading");
    return null;
  },
  { revalidate, successMessage: "Reading deleted" },
);

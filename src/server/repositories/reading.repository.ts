import "server-only";
import { db } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";
import { profileRangeWhere, type DateRange, type ListOptions } from "./shared";

/**
 * Blood pressure and glucose share the same access pattern
 * (profile-scoped, time-ordered), so both repositories are thin wrappers
 * over the same helpers.
 */
export const bloodPressureRepository = {
  list(profileId: string, range?: DateRange, { take, order = "desc" }: ListOptions = {}) {
    return db.bloodPressureReading.findMany({
      where: profileRangeWhere(profileId, range),
      orderBy: { measuredAt: order },
      take,
    });
  },

  latest(profileId: string) {
    return db.bloodPressureReading.findFirst({ where: { profileId }, orderBy: { measuredAt: "desc" } });
  },

  create(profileId: string, data: Omit<Prisma.BloodPressureReadingUncheckedCreateInput, "profileId">) {
    return db.bloodPressureReading.create({ data: { ...data, profileId } });
  },

  async deleteForProfile(id: string, profileId: string) {
    const { count } = await db.bloodPressureReading.deleteMany({ where: { id, profileId } });
    return count > 0;
  },
};

export const glucoseRepository = {
  list(profileId: string, range?: DateRange, { take, order = "desc" }: ListOptions = {}) {
    return db.glucoseReading.findMany({
      where: profileRangeWhere(profileId, range),
      orderBy: { measuredAt: order },
      take,
    });
  },

  latest(profileId: string) {
    return db.glucoseReading.findFirst({ where: { profileId }, orderBy: { measuredAt: "desc" } });
  },

  create(profileId: string, data: Omit<Prisma.GlucoseReadingUncheckedCreateInput, "profileId">) {
    return db.glucoseReading.create({ data: { ...data, profileId } });
  },

  async deleteForProfile(id: string, profileId: string) {
    const { count } = await db.glucoseReading.deleteMany({ where: { id, profileId } });
    return count > 0;
  },
};

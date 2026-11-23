"use server";

import { idSchema } from "@/features/shared/schemas";
import { protectedAction } from "@/server/actions/safe-action";
import { notFound } from "@/server/errors";
import { conditionRepository } from "@/server/repositories/condition.repository";
import { conditionSchema, conditionStatusSchema } from "./schemas";

const revalidate = ["/conditions", "/medications", "/reports"];
const day = (ymd: string | undefined) => (ymd ? new Date(`${ymd}T00:00:00Z`) : null);

/** Creates a condition, or updates it when `id` is given (only within the active profile). */
export const saveCondition = protectedAction(
  conditionSchema,
  async ({ id, name, status, diagnosedOn, resolvedOn, doctorName, notes }, { profile }) => {
    const data = {
      name,
      status,
      diagnosedOn: day(diagnosedOn),
      resolvedOn: status === "RESOLVED" ? (day(resolvedOn) ?? new Date()) : null,
      doctorName: doctorName || null,
      notes: notes || null,
    };
    if (id) {
      if (!(await conditionRepository.updateForProfile(id, profile.id, data))) throw notFound("Condition");
    } else {
      await conditionRepository.create(profile.id, data);
    }
    return null;
  },
  { revalidate, successMessage: "Condition saved" },
);

export const setConditionStatus = protectedAction(
  conditionStatusSchema,
  async ({ id, status }, { profile }) => {
    const ok = await conditionRepository.updateForProfile(id, profile.id, { status, resolvedOn: status === "RESOLVED" ? new Date() : null });
    if (!ok) throw notFound("Condition");
    return null;
  },
  { revalidate },
);

export const deleteCondition = protectedAction(
  idSchema,
  async ({ id }, { profile }) => {
    if (!(await conditionRepository.deleteForProfile(id, profile.id))) throw notFound("Condition");
    return null;
  },
  { revalidate, successMessage: "Condition removed" },
);

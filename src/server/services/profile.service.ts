import "server-only";
import { cookies } from "next/headers";
import { planLimits } from "@/config/plans";
import type { Plan } from "@/domain/enums";
import type { GlucoseTargets } from "@/domain/glucose";
import type { Profile } from "@/generated/prisma/client";
import type { ProfileInput } from "@/features/profiles/schemas";
import { AppError, notFound } from "@/server/errors";
import { profileRepository } from "@/server/repositories/profile.repository";

const ACTIVE_PROFILE_COOKIE = "ht_profile";

function toData(input: ProfileInput) {
  return {
    ...input,
    dateOfBirth: input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00Z`) : null,
    gender: input.gender ?? null,
  };
}

export function glucoseTargetsOf(profile: Profile): GlucoseTargets {
  return { low: profile.glucoseLow, fastingMax: profile.glucoseFastingMax, postMealMax: profile.glucosePostMealMax };
}

export function bpTargetOf(profile: Profile) {
  return { systolic: profile.bpSystolicTarget, diastolic: profile.bpDiastolicTarget };
}

export const profileService = {
  list: profileRepository.listByUser,

  /** Profile selected via cookie, falling back to the user's default. Never trusts the cookie blindly. */
  async getActive(userId: string): Promise<Profile> {
    const selectedId = (await cookies()).get(ACTIVE_PROFILE_COOKIE)?.value;
    const selected = selectedId ? await profileRepository.findForUser(selectedId, userId) : null;
    const profile = selected ?? (await profileRepository.findDefault(userId));
    if (!profile) throw notFound("Profile");
    return profile;
  },

  async setActive(userId: string, profileId: string) {
    const profile = await profileRepository.findForUser(profileId, userId);
    if (!profile) throw notFound("Profile");
    (await cookies()).set(ACTIVE_PROFILE_COOKIE, profile.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return profile;
  },

  async create(user: { id: string; plan: Plan }, input: ProfileInput) {
    const { maxProfiles, label } = planLimits(user.plan);
    if ((await profileRepository.countByUser(user.id)) >= maxProfiles) {
      throw new AppError(`The ${label} plan allows up to ${maxProfiles} profiles. Upgrade to add more.`, "PLAN_LIMIT");
    }
    return profileRepository.create(user.id, toData(input));
  },

  async update(userId: string, profileId: string, input: ProfileInput) {
    if (!(await profileRepository.updateForUser(profileId, userId, toData(input)))) throw notFound("Profile");
  },

  async remove(userId: string, profileId: string) {
    if (!(await profileRepository.deleteForUser(profileId, userId))) {
      throw new AppError("Profile not found or it is your primary profile.", "BAD_REQUEST");
    }
  },
};

"use server";

import { isValidTimeZone } from "@/lib/dates";
import { protectedAction } from "@/server/actions/safe-action";
import { AppError } from "@/server/errors";
import { userRepository } from "@/server/repositories/user.repository";
import { profileService } from "@/server/services/profile.service";
import { idSchema } from "@/features/shared/schemas";
import { accountSchema, profileSchema, switchProfileSchema } from "./schemas";

// Profile changes affect every page in the app shell.
const revalidate = ["/", "/dashboard", "/settings"];

export const switchProfile = protectedAction(
  switchProfileSchema,
  async ({ profileId }, { user }) => {
    await profileService.setActive(user.id, profileId);
    return null;
  },
  { revalidate },
);

export const createProfile = protectedAction(
  profileSchema,
  async (input, { user }) => {
    const profile = await profileService.create(user, input);
    await profileService.setActive(user.id, profile.id);
    return { id: profile.id };
  },
  { revalidate, successMessage: "Profile created and selected" },
);

export const updateActiveProfile = protectedAction(
  profileSchema,
  async (input, { user, profile }) => {
    await profileService.update(user.id, profile.id, input);
    return null;
  },
  { revalidate, successMessage: "Profile updated" },
);

export const deleteProfile = protectedAction(
  idSchema,
  async ({ id }, { user }) => {
    await profileService.remove(user.id, id);
    return null;
  },
  { revalidate, successMessage: "Profile deleted" },
);

export const updateAccount = protectedAction(
  accountSchema,
  async (input, { user }) => {
    if (!isValidTimeZone(input.timezone)) throw new AppError("Unknown timezone");
    await userRepository.update(user.id, input);
    return null;
  },
  { revalidate, successMessage: "Account updated" },
);

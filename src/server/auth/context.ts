import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Profile } from "@/generated/prisma/client";
import { userRepository, type SafeUser } from "@/server/repositories/user.repository";
import { profileService } from "@/server/services/profile.service";
import { getSessionUserId } from "./session";

export interface AppContext {
  user: SafeUser;
  profile: Profile;
}

export const getCurrentUser = cache(async (): Promise<SafeUser | null> => {
  const userId = await getSessionUserId();
  return userId ? userRepository.findById(userId) : null;
});

/** For pages/layouts: redirects anonymous visitors to the login page. */
export async function requireUser(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Signed-in user plus the currently selected patient profile. */
export const requireAppContext = cache(async (): Promise<AppContext> => {
  const user = await requireUser();
  const profile = await profileService.getActive(user.id);
  return { user, profile };
});

/** For actions/route handlers: returns null instead of redirecting. */
export async function getAppContext(): Promise<AppContext | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return { user, profile: await profileService.getActive(user.id) };
}

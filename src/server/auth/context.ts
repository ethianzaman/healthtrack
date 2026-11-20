import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Profile } from "@/generated/prisma/client";
import { userRepository, type SafeUser } from "@/server/repositories/user.repository";
import { activityService } from "@/server/services/activity.service";
import { profileService } from "@/server/services/profile.service";
import { getSessionUserId } from "./session";

export interface AppContext {
  user: SafeUser;
  profile: Profile;
}

export const getCurrentUser = cache(async (): Promise<SafeUser | null> => {
  const userId = await getSessionUserId();
  const user = userId ? await userRepository.findById(userId) : null;
  // A suspended account is treated as signed out on every request, so suspension takes effect immediately.
  return user && user.status !== "SUSPENDED" ? user : null;
});

/** For pages/layouts: redirects anonymous visitors to the login page. */
export async function requireUser(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * User and active profile in parallel: the session already carries the user id,
 * so the profile lookup doesn't have to wait for the user row (one DB round trip, not two).
 */
const loadAppContext = cache(async (): Promise<AppContext | "unverified" | null> => {
  const userId = await getSessionUserId();
  if (!userId) return null;
  // Both queries start now and run concurrently.
  const profilePromise = profileService.getActive(userId);
  profilePromise.catch(() => {}); // handled below; avoids an unhandled rejection while awaiting the user
  const user = await getCurrentUser();
  if (!user) return null; // deleted/suspended account behind a still-valid cookie -> sign in again
  if (!user.emailVerifiedAt) return "unverified"; // signed in, but the emailed code hasn't been entered yet
  activityService.touchActive(user);
  return { user, profile: await profilePromise };
});

/** Signed-in, email-confirmed user plus the currently selected patient profile. */
export async function requireAppContext(): Promise<AppContext> {
  const ctx = await loadAppContext();
  if (ctx === "unverified") redirect("/verify-email");
  if (!ctx) redirect("/login");
  return ctx;
}

/** For actions/route handlers: returns null instead of redirecting. */
export async function getAppContext(): Promise<AppContext | null> {
  const ctx = await loadAppContext();
  return ctx === "unverified" ? null : ctx;
}

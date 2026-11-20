import "server-only";
import { headers } from "next/headers";
import { after } from "next/server";
import type { ActivityType } from "@/domain/activity";
import { logger } from "@/server/logger";
import { activityRepository } from "@/server/repositories/activity.repository";
import { userRepository } from "@/server/repositories/user.repository";

const ACTIVE_THROTTLE_MS = 15 * 60_000;

/** Two-letter country from Vercel's edge; the IP address itself is never stored. */
async function country() {
  try {
    const value = (await headers()).get("x-vercel-ip-country");
    return value && /^[A-Z]{2}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

export const activityService = {
  /**
   * Records a usage event after the response is sent, so tracking never slows a page
   * and a tracking failure never breaks the user's action.
   */
  async track(type: ActivityType, opts: { userId: string | null; detail?: string }) {
    const where = await country();
    after(async () => {
      try {
        await activityRepository.record({ userId: opts.userId, type, detail: opts.detail ?? null, country: where });
      } catch (error) {
        logger.error("Activity tracking failed", error);
      }
    });
  },

  /** Updates "last active" at most every 15 minutes per user (one cheap write, after the response). */
  touchActive(user: { id: string; lastActiveAt: Date | null }) {
    if (user.lastActiveAt && Date.now() - user.lastActiveAt.getTime() < ACTIVE_THROTTLE_MS) return;
    after(async () => {
      try {
        await userRepository.touch(user.id, { lastActiveAt: new Date() });
      } catch (error) {
        logger.error("lastActiveAt update failed", error);
      }
    });
  },
};

import "server-only";
import { db } from "@/server/db";
import type { ActivityType } from "@/domain/activity";

export const activityRepository = {
  record(data: { userId: string | null; type: ActivityType; detail?: string | null; country?: string | null }) {
    return db.activityEvent.create({ data, select: { id: true } });
  },

  listForUser(userId: string, take = 100) {
    return db.activityEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take });
  },
};

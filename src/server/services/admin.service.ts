import "server-only";
import { isAdminEmail } from "@/server/auth/admin";
import { getCurrentUser } from "@/server/auth/context";
import { AppError } from "@/server/errors";
import { adminRepository } from "@/server/repositories/admin.repository";
import { accountLifecycleService as lifecycle } from "./account-lifecycle.service";

/** For admin actions: a typed error instead of a redirect/404. Checked on every call. */
async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) throw new AppError("Not allowed", "FORBIDDEN");
  return user;
}

export const adminService = {
  overview: adminRepository.overview,
  listUsers: adminRepository.listUsers,
  userDetail: adminRepository.userDetail,

  warn: async (userId: string, reason: string) => lifecycle.warn(await assertAdmin(), userId, reason),
  suspend: async (userId: string, reason: string, scheduleDeletion: boolean) => lifecycle.suspend(await assertAdmin(), userId, reason, scheduleDeletion),
  reactivate: async (userId: string, reason?: string) => lifecycle.reactivate(await assertAdmin(), userId, reason),
  scheduleDeletion: async (userId: string) => lifecycle.scheduleDeletion(await assertAdmin(), userId),
  cancelDeletion: async (userId: string) => lifecycle.cancelDeletion(await assertAdmin(), userId),
};

"use server";

import { publicAction } from "@/server/actions/safe-action";
import { adminService } from "@/server/services/admin.service";
import { reactivateUserSchema, suspendUserSchema, targetUserSchema, warnUserSchema } from "./schemas";

// publicAction only validates input; adminService checks the caller is an admin on every call.
const revalidate = ["/admin", "/admin/users"];
const emailNote = (sent: boolean) => (sent ? "" : " (email not sent: email isn't configured yet)");

export const warnUser = publicAction(
  warnUserSchema,
  async ({ userId, reason }) => {
    const { emailSent } = await adminService.warn(userId, reason);
    return { message: `Warning recorded. The user has 14 days to respond${emailNote(emailSent)}.` };
  },
  { revalidate },
);

export const suspendUser = publicAction(
  suspendUserSchema,
  async ({ userId, reason, scheduleDeletion }) => {
    const { deletionAt, emailSent } = await adminService.suspend(userId, reason, scheduleDeletion);
    return {
      message: deletionAt
        ? `Suspended. Data will be deleted in 30 days; final notice with a data export sent${emailNote(emailSent)}.`
        : "Suspended. The user is signed out and their doctor links stop working.",
    };
  },
  { revalidate },
);

export const reactivateUser = publicAction(
  reactivateUserSchema,
  async ({ userId, reason }) => {
    await adminService.reactivate(userId, reason);
    return { message: "Account reactivated. Any warning or scheduled deletion was cleared." };
  },
  { revalidate },
);

export const scheduleDeletion = publicAction(
  targetUserSchema,
  async ({ userId }) => {
    const { emailSent } = await adminService.scheduleDeletion(userId);
    return { message: `Deletion scheduled in 30 days; final notice sent${emailNote(emailSent)}.` };
  },
  { revalidate },
);

export const cancelDeletion = publicAction(
  targetUserSchema,
  async ({ userId }) => {
    await adminService.cancelDeletion(userId);
    return { message: "Scheduled deletion cancelled. The account stays suspended." };
  },
  { revalidate },
);

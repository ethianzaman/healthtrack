import { z } from "zod";

const userId = z.string().min(1);
const requiredReason = z.string().trim().min(5, "Write a short reason (min 5 characters)").max(300);

export const warnUserSchema = z.object({ userId, reason: requiredReason });

export const suspendUserSchema = z.object({
  userId,
  reason: requiredReason,
  /** Also start the 30-day deletion countdown and send the final notice with a data export. */
  scheduleDeletion: z.boolean(),
});

export const reactivateUserSchema = z.object({ userId, reason: z.string().trim().max(300).optional() });

export const targetUserSchema = z.object({ userId });

export const warningResponseSchema = z.object({
  response: z.string().trim().min(10, "Please write a few words (min 10 characters)").max(2000),
});

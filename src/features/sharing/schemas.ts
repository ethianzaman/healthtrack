import { z } from "zod";

export const SHARE_EXPIRY_OPTIONS = [1, 7, 30, 90] as const;

export const shareLinkSchema = z.object({
  label: z.string().trim().min(1, "Give the link a name (e.g. Dr. Rahman)").max(60),
  expiresInDays: z.number().int().refine((d) => (SHARE_EXPIRY_OPTIONS as readonly number[]).includes(d), "Invalid expiry"),
});

export type ShareLinkInput = z.infer<typeof shareLinkSchema>;

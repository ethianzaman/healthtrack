"use server";

import { protectedAction } from "@/server/actions/safe-action";
import { shareService } from "@/server/services/share.service";
import { idSchema } from "@/features/shared/schemas";
import { shareLinkSchema } from "./schemas";

const revalidate = ["/sharing"];

export const createShareLink = protectedAction(shareLinkSchema, (input, ctx) => shareService.create(ctx, input), {
  revalidate,
  successMessage: "Share link created - copy it now, it won't be shown again.",
});

export const revokeShareLink = protectedAction(
  idSchema,
  async ({ id }, { profile }) => {
    await shareService.revoke(profile.id, id);
    return null;
  },
  { revalidate, successMessage: "Link revoked" },
);

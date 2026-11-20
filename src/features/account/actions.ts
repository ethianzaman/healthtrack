"use server";

import { warningResponseSchema } from "@/features/admin/schemas";
import { protectedAction } from "@/server/actions/safe-action";
import { accountLifecycleService } from "@/server/services/account-lifecycle.service";

export const respondToWarning = protectedAction(
  warningResponseSchema,
  async ({ response }, { user }) => {
    await accountLifecycleService.respond(user, response);
    return null;
  },
  { revalidate: ["/dashboard"], successMessage: "Thanks - we received your response and will review it." },
);

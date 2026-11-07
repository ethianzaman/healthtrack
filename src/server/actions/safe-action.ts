import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { getAppContext, type AppContext } from "@/server/auth/context";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logger";

interface ActionOptions {
  /** Paths to revalidate after a successful mutation. */
  revalidate?: string[];
  /** Message shown to the user on success. */
  successMessage?: string;
}

type Handler<S extends z.ZodType, R, C> = (input: z.output<S>, ctx: C) => Promise<R>;

function toFailure(error: unknown): ActionResult<never> {
  if (error instanceof AppError) return { ok: false, error: error.message };
  logger.error("Unhandled action error", error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

async function run<S extends z.ZodType, R, C>(
  schema: S,
  rawInput: unknown,
  ctx: C,
  handler: Handler<S, R, C>,
  options: ActionOptions,
): Promise<ActionResult<R>> {
  const parsed = schema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[] | undefined>,
    };
  }
  try {
    const data = await handler(parsed.data, ctx);
    options.revalidate?.forEach((path) => revalidatePath(path));
    return { ok: true, data, message: options.successMessage };
  } catch (error) {
    return toFailure(error);
  }
}

/**
 * Wraps a server action with validation and consistent error handling.
 * Usage (in a "use server" file):
 *   export const login = publicAction(loginSchema, async (input) => {...});
 */
export function publicAction<S extends z.ZodType, R>(schema: S, handler: Handler<S, R, null>, options: ActionOptions = {}) {
  return async (input: z.input<S>): Promise<ActionResult<R>> => run(schema, input, null, handler, options);
}

/** Same as publicAction, but requires a session and injects the user + active profile. */
export function protectedAction<S extends z.ZodType, R>(
  schema: S,
  handler: Handler<S, R, AppContext>,
  options: ActionOptions = {},
) {
  return async (input: z.input<S>): Promise<ActionResult<R>> => {
    const ctx = await getAppContext();
    if (!ctx) return { ok: false, error: "Your session has expired. Please sign in again." };
    return run(schema, input, ctx, handler, options);
  };
}

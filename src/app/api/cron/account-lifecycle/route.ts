import { timingSafeEqual } from "node:crypto";
import { getEnv } from "@/config/env";
import { logger } from "@/server/logger";
import { accountLifecycleService } from "@/server/services/account-lifecycle.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron calls this daily with `Authorization: Bearer <CRON_SECRET>`. Anyone else gets 401. */
function authorized(request: Request) {
  const secret = getEnv().CRON_SECRET;
  if (!secret) return false; // not configured: never run
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const result = await accountLifecycleService.runDaily();
  logger.info("Account lifecycle run", result);
  return Response.json({ ok: true, ...result });
}

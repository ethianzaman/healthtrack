import { getEnv } from "@/config/env";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

type Check = { ok: true } | { ok: false; error: string };

/** Short, secret-free description of a failure (variable names or DB error text only). */
function describe(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, " ").slice(0, 300);
}

async function check(fn: () => unknown): Promise<Check> {
  try {
    await fn();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: describe(error) };
  }
}

/**
 * Liveness/readiness probe for load balancers and uptime monitors.
 * Also tells a new deployment what is missing: env vars, DB connection, or migrations.
 */
export async function GET() {
  const env = await check(() => getEnv());
  const database = env.ok ? await check(() => db.$queryRaw`SELECT 1`) : { ok: false as const, error: "skipped: fix env first" };
  const tables = database.ok ? await check(() => db.user.count()) : { ok: false as const, error: "skipped: fix database first" };

  const ok = env.ok && database.ok && tables.ok;
  return Response.json(
    { status: ok ? "ok" : "error", time: new Date().toISOString(), checks: { env, database, tables } },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}

import { getEnv } from "@/config/env";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

type Check = { ok: true } | { ok: false; error: string };

/** Every table created by prisma/migrations; a partial migration fails the check. */
const REQUIRED_TABLES = ["User", "Profile", "BloodPressureReading", "GlucoseReading", "Medication", "ShareLink"];

async function assertTables() {
  const rows = await db.$queryRaw<{ name: string }[]>`SELECT name FROM sqlite_master WHERE type = 'table'`;
  const present = new Set(rows.map((r) => r.name));
  const missing = REQUIRED_TABLES.filter((t) => !present.has(t));
  if (missing.length) throw new Error(`Missing tables: ${missing.join(", ")}. Run the full prisma/migrations SQL.`);
}

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
  const tables = database.ok ? await check(assertTables) : { ok: false as const, error: "skipped: fix database first" };

  const ok = env.ok && database.ok && tables.ok;
  return Response.json(
    { status: ok ? "ok" : "error", time: new Date().toISOString(), checks: { env, database, tables } },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}

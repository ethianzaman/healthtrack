// Applies prisma/migrations/*/migration.sql to a hosted libSQL (Turso) database.
// `prisma migrate deploy` cannot talk to libsql:// URLs, so this is the deploy path for Turso.
//
// Safe to re-run:
//  - applied migrations are recorded in "_app_migrations" and skipped next time;
//  - CREATE TABLE / CREATE INDEX run as IF NOT EXISTS;
//  - "duplicate column" from ADD COLUMN means it already ran, so it is skipped.
// Migrations in this repo are additive (no DROP / table rewrite), so existing data is kept.
//
// Safety: row counts of every existing table are compared before/after; if any table lost
// rows the script fails. On Vercel it runs inside `npm run build`, so a failed migration
// fails the build and the previous version stays live.
//
// Usage: DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... npm run db:deploy:remote
//        --if-remote: do nothing (exit 0) unless DATABASE_URL is a Turso URL (used by `npm run build`)
import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL;
const isRemote = Boolean(url?.startsWith("libsql://"));
if (!isRemote && process.env.MIGRATE_ALLOW_LOCAL !== "1") {
  if (process.argv.includes("--if-remote")) {
    console.log("migrate: DATABASE_URL is not a Turso URL, skipping remote migrations.");
    process.exit(0);
  }
  console.error("DATABASE_URL must be a libsql:// URL (your Turso database).");
  process.exit(1);
}

const dir = "prisma/migrations";
const migrations = readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

/** Splits a migration file into statements (no statement in our migrations contains ";" in a string). */
function statements(sql) {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) =>
      s
        .replace(/^CREATE TABLE (?!IF NOT EXISTS)/, "CREATE TABLE IF NOT EXISTS ")
        .replace(/^CREATE (UNIQUE )?INDEX (?!IF NOT EXISTS)/, "CREATE $1INDEX IF NOT EXISTS "),
    );
}

const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });

/** Row count of every user table (not internal ones). */
async function rowCounts() {
  const { rows } = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '\\_%' ESCAPE '\\' AND name NOT LIKE 'sqlite%'");
  const counts = {};
  for (const r of rows) counts[r.name] = Number((await client.execute(`SELECT COUNT(*) AS n FROM "${r.name}"`)).rows[0].n);
  return counts;
}

await client.execute(`CREATE TABLE IF NOT EXISTS "_app_migrations" ("name" TEXT PRIMARY KEY, "appliedAt" TEXT NOT NULL)`);
const done = new Set((await client.execute(`SELECT name FROM "_app_migrations"`)).rows.map((r) => r.name));
const pending = migrations.filter((m) => !done.has(m));
const before = pending.length ? await rowCounts() : {};

for (const name of migrations) {
  if (done.has(name)) {
    console.log(`skip    ${name} (already applied)`);
    continue;
  }
  for (const stmt of statements(readFileSync(join(dir, name, "migration.sql"), "utf8"))) {
    try {
      await client.execute(stmt);
    } catch (error) {
      if (/duplicate column name/i.test(String(error?.message ?? error))) continue;
      console.error(`failed  ${name}\n${stmt}\n`);
      throw error;
    }
  }
  await client.execute({ sql: `INSERT INTO "_app_migrations" ("name", "appliedAt") VALUES (?, ?)`, args: [name, new Date().toISOString()] });
  console.log(`applied ${name}`);
}

if (pending.length) {
  const after = await rowCounts();
  const lost = Object.entries(before).filter(([table, n]) => (after[table] ?? 0) < n);
  if (lost.length) {
    console.error("STOP: rows went missing during migration:", lost.map(([t, n]) => `${t} ${n} -> ${after[t] ?? 0}`).join(", "));
    process.exit(1);
  }
  console.log("data check: no table lost rows", JSON.stringify(after));
} else {
  console.log("migrate: database is up to date.");
}

const { rows } = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '\\_%' ESCAPE '\\' ORDER BY name");
console.log("tables:", rows.map((r) => r.name).join(", "));
client.close();

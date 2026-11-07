// Applies every prisma/migrations/*/migration.sql to a hosted libSQL (Turso) database.
// `prisma migrate deploy` cannot talk to libsql:// URLs, so this is the deploy path for Turso.
// Idempotent: CREATE TABLE / CREATE INDEX become IF NOT EXISTS, so re-running after a
// partial run is safe.
//
// Usage: DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... npm run db:deploy:remote
import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL;
if (!url?.startsWith("libsql://")) {
  console.error("DATABASE_URL must be a libsql:// URL (your Turso database).");
  process.exit(1);
}

const dir = "prisma/migrations";
const migrations = readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });

for (const name of migrations) {
  const sql = readFileSync(join(dir, name, "migration.sql"), "utf8")
    .replace(/CREATE TABLE (?!IF NOT EXISTS)/g, "CREATE TABLE IF NOT EXISTS ")
    .replace(/CREATE (UNIQUE )?INDEX (?!IF NOT EXISTS)/g, "CREATE $1INDEX IF NOT EXISTS ");
  await client.executeMultiple(sql);
  console.log(`applied ${name}`);
}

const { rows } = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
console.log("tables:", rows.map((r) => r.name).join(", "));
client.close();

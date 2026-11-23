// Loads prisma/data/dgda-medicines.json.gz into the MedicineCatalog table.
// Touches ONLY MedicineCatalog (reference data); user tables are never read or written.
// Skips when this snapshot is already loaded (recorded in "_app_migrations"), so it is cheap to run on every deploy.
//
// Usage: npm run catalog:seed            (uses DATABASE_URL: local file or Turso)
//        --if-remote: only run for a Turso (libsql://) database (used by `npm run build`)
import "dotenv/config";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
if (process.argv.includes("--if-remote") && !url.startsWith("libsql://")) {
  console.log("catalog: DATABASE_URL is not a Turso URL, skipping (run `npm run catalog:seed` for a local database).");
  process.exit(0);
}

const snapshot = JSON.parse(gunzipSync(readFileSync("prisma/data/dgda-medicines.json.gz")).toString("utf8"));
const marker = `catalog:dgda:${snapshot.fetchedAt}:${snapshot.count}`;

/** "Amlodipine + Atenolol 5 mg + 25 mg" -> { generic: "Amlodipine + Atenolol", strength: "5 mg + 25 mg" }. */
function splitGeneric(text) {
  const m = text.match(/\s(\d[\d.,/]*\s*(?:mg|mcg|µg|g|gm|ml|iu|i\.u\.|%|units?|unit|million|lac|lakh|billion|cfu|mmol|meq|ppm)\b.*)$/i);
  return m ? { generic: text.slice(0, m.index).trim(), strength: m[1].trim() } : { generic: text.trim(), strength: "" };
}

const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
await client.execute(`CREATE TABLE IF NOT EXISTS "_app_migrations" ("name" TEXT PRIMARY KEY, "appliedAt" TEXT NOT NULL)`);
const { rows: done } = await client.execute({ sql: `SELECT name FROM "_app_migrations" WHERE name = ?`, args: [marker] });
if (done.length) {
  console.log(`catalog: snapshot already loaded (${snapshot.count} medicines).`);
  client.close();
  process.exit(0);
}

const records = snapshot.records.map((r) => ({ ...r, ...splitGeneric(r.generic) }));
const ROWS_PER_INSERT = 100;
const INSERTS_PER_BATCH = 40;
const inserts = [];
for (let i = 0; i < records.length; i += ROWS_PER_INSERT) {
  const chunk = records.slice(i, i + ROWS_PER_INSERT);
  inserts.push({
    sql: `INSERT INTO "MedicineCatalog" ("brand","brandKey","generic","strength","form","company","dar") VALUES ${chunk.map(() => "(?,?,?,?,?,?,?)").join(",")}`,
    args: chunk.flatMap((r) => [r.brand, r.brand.toLowerCase(), r.generic, r.strength, r.form, r.company, r.dar || null]),
  });
}

console.log(`catalog: loading ${records.length} medicines...`);
for (let i = 0; i < inserts.length; i += INSERTS_PER_BATCH) {
  const batch = inserts.slice(i, i + INSERTS_PER_BATCH);
  // The first batch also clears the previous snapshot; a failure part-way is redone on the next run (no marker yet).
  await client.batch(i === 0 ? [{ sql: `DELETE FROM "MedicineCatalog"` }, ...batch] : batch, "write");
  process.stdout.write(`\r  ${Math.min((i + INSERTS_PER_BATCH) * ROWS_PER_INSERT, records.length)}/${records.length}`);
}
const { rows } = await client.execute(`SELECT COUNT(*) AS n FROM "MedicineCatalog"`);
if (Number(rows[0].n) !== records.length) {
  console.error(`\ncatalog: expected ${records.length} rows, found ${rows[0].n}; will retry next run.`);
  process.exit(1);
}
await client.execute({ sql: `INSERT INTO "_app_migrations" ("name","appliedAt") VALUES (?,?)`, args: [marker, new Date().toISOString()] });
console.log(`\ncatalog: done (${rows[0].n} medicines).`);
client.close();

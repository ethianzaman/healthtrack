// Downloads the DGDA (Directorate General of Drug Administration, Bangladesh) list of registered
// allopathic medicines and saves a compressed snapshot to prisma/data/dgda-medicines.json.gz.
// The snapshot is committed and loaded into the MedicineCatalog table by scripts/seed-catalog.mjs.
//
// Polite by design: 500 rows per request, a pause between requests, retries with back-off.
// Run occasionally (e.g. every few months) to refresh:  npm run catalog:fetch
import { mkdirSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const ENDPOINT = "http://180.211.137.202:9310/Allopathic/Medicine_Information_Ajax.php";
const PAGE = 500;
const PAUSE_MS = 800;
const OUT = "prisma/data/dgda-medicines.json.gz";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s) => String(s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

async function page(start, draw) {
  const params = new URLSearchParams({ action: "list", draw: String(draw), start: String(start), length: String(PAGE), "order[0][column]": "0", "order[0][dir]": "asc", "search[value]": "" });
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(`${ENDPOINT}?${params}`, { headers: { "User-Agent": "HealthTrack catalog import" }, signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      if (attempt === 4) throw error;
      console.warn(`  retry ${attempt} at ${start}: ${error.message}`);
      await sleep(2000 * attempt);
    }
  }
}

const first = await page(0, 1);
const total = first.recordsTotal;
console.log(`DGDA reports ${total} registered allopathic medicines`);
const rows = [...first.data];
for (let start = PAGE, draw = 2; start < total; start += PAGE, draw++) {
  await sleep(PAUSE_MS);
  const { data } = await page(start, draw);
  rows.push(...data);
  process.stdout.write(`\r  ${rows.length}/${total}`);
}
console.log();

// [SL, Company, Trade name, Generic name with strength, Dosage form, DAR no, price link]
const seen = new Set();
const records = [];
for (const r of rows) {
  const rec = { company: clean(r[1]), brand: clean(r[2]), generic: clean(r[3]), form: clean(r[4]), dar: clean(r[5]) };
  if (!rec.brand || !rec.generic) continue;
  const key = `${rec.dar}|${rec.brand}|${rec.generic}|${rec.form}`;
  if (seen.has(key)) continue;
  seen.add(key);
  records.push(rec);
}

mkdirSync("prisma/data", { recursive: true });
const json = JSON.stringify({ source: ENDPOINT, fetchedAt: new Date().toISOString(), count: records.length, records });
writeFileSync(OUT, gzipSync(json));
console.log(`Saved ${records.length} records to ${OUT} (${(gzipSync(json).length / 1024).toFixed(0)} KB)`);

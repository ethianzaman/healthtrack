import { toZonedYmd } from "./dates";

export interface DailyCount {
  label: string;
  [series: string]: string | number;
}

/**
 * Buckets timestamped events into one row per local day for the last `days` days
 * (oldest first, empty days included as 0), one column per event type.
 */
export function dailyActivitySeries(
  events: { type: string; createdAt: Date }[],
  types: readonly string[],
  days: number,
  timeZone: string,
  now = new Date(),
): DailyCount[] {
  const rows = new Map<string, DailyCount>();
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 86_400_000);
    const key = toZonedYmd(day, timeZone);
    rows.set(key, { label: key.slice(5).replace("-", "/"), ...Object.fromEntries(types.map((t) => [t, 0])) });
  }
  for (const e of events) {
    const row = rows.get(toZonedYmd(e.createdAt, timeZone));
    if (row && types.includes(e.type)) row[e.type] = (row[e.type] as number) + 1;
  }
  return [...rows.values()];
}

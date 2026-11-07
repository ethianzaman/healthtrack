/**
 * Timezone-aware date helpers built on Intl (no extra dependency).
 * All persisted dates are UTC; conversion happens at the edges.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

/** Offset (ms) of `timeZone` relative to UTC at the given instant. */
function offsetMs(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000;
}

/** UTC instant of 00:00 on calendar day `ymd` (YYYY-MM-DD) in `timeZone`. */
export function startOfZonedDay(ymd: string, timeZone: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const utcGuess = Date.UTC(y, m - 1, d);
  const first = utcGuess - offsetMs(new Date(utcGuess), timeZone);
  // Re-evaluate once to handle DST transitions.
  return new Date(utcGuess - offsetMs(new Date(first), timeZone));
}

/** Calendar date (YYYY-MM-DD) of an instant in `timeZone`. */
export function toZonedYmd(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Inclusive calendar-day range -> half-open UTC interval [from, to). */
export function zonedDayRange(fromYmd: string, toYmd: string, timeZone: string) {
  return {
    from: startOfZonedDay(fromYmd, timeZone),
    to: new Date(startOfZonedDay(toYmd, timeZone).getTime() + DAY_MS),
  };
}

/** Range covering the last `days` calendar days including today. */
export function lastDaysRange(days: number, timeZone: string, now = new Date()) {
  const toYmd = toZonedYmd(now, timeZone);
  const fromYmd = toZonedYmd(new Date(now.getTime() - (days - 1) * DAY_MS), timeZone);
  return { fromYmd, toYmd, ...zonedDayRange(fromYmd, toYmd, timeZone) };
}

export function formatDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function formatTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: true }).format(date);
}

/** 24h HH:mm - for machine-readable exports. */
export function formatTime24(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

export function formatDateTime(date: Date, timeZone: string) {
  return `${formatDate(date, timeZone)}, ${formatTime(date, timeZone)}`;
}

export function formatShortDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, day: "2-digit", month: "short" }).format(date);
}

export function ageFrom(dateOfBirth: Date | null, now = new Date()) {
  if (!dateOfBirth) return null;
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const m = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dateOfBirth.getUTCDate())) age--;
  return age;
}

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Generic, dependency-free statistics helpers. */

export interface NumberStats {
  count: number;
  avg: number | null;
  min: number | null;
  max: number | null;
}

export function numberStats(values: number[]): NumberStats {
  if (values.length === 0) return { count: 0, avg: null, min: null, max: null };
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { count: values.length, avg: round(sum / values.length), min, max };
}

export function round(value: number, digits = 1) {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Partial<Record<K, T[]>> {
  const out: Partial<Record<K, T[]>> = {};
  for (const item of items) {
    const k = key(item);
    (out[k] ??= []).push(item);
  }
  return out;
}

export function countBy<T, K extends string>(items: T[], key: (item: T) => K): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = {};
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/** Percentage (0-100, one decimal) of items matching a predicate. */
export function percentage<T>(items: T[], predicate: (item: T) => boolean) {
  if (items.length === 0) return null;
  return round((items.filter(predicate).length / items.length) * 100);
}

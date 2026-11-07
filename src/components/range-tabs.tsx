import Link from "next/link";
import { cn } from "@/lib/utils";

export const RANGE_OPTIONS = [7, 30, 90] as const;
export type RangeDays = (typeof RANGE_OPTIONS)[number];

/** Parse a `?days=` search param safely, defaulting to 30. */
export function parseRangeDays(value: string | string[] | undefined): RangeDays {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return (RANGE_OPTIONS as readonly number[]).includes(n) ? (n as RangeDays) : 30;
}

/** Underlined text tabs: 7D / 30D / 90D. */
export function RangeTabs({ basePath, active }: { basePath: string; active: RangeDays }) {
  return (
    <div className="flex items-center gap-5 font-mono text-[13px]" role="tablist" aria-label="Date range">
      {RANGE_OPTIONS.map((d) => (
        <Link
          key={d}
          href={`${basePath}?days=${d}`}
          role="tab"
          aria-selected={active === d}
          className={cn(
            "-my-2 border-b-2 py-2 tabular-nums transition-colors",
            active === d ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink",
          )}
        >
          {d}D
        </Link>
      ))}
    </div>
  );
}

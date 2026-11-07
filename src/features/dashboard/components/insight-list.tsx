import { SEVERITY_CLASSES } from "@/components/ui/severity-badge";
import type { Insight } from "@/domain/insights";
import { cn } from "@/lib/utils";

/** Notes in the margin: severity dot, title, one line of explanation. */
export function InsightList({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return <p className="font-display text-[15px] text-ink-3">Observations appear once a few readings are logged.</p>;
  }
  return (
    <ol className="divide-y divide-line-soft">
      {insights.map((i, n) => (
        <li key={i.id} className="grid grid-cols-[28px_1fr] gap-x-2 py-3 first:pt-0 last:pb-0">
          <span className="font-mono text-[11px] tabular-nums text-ink-3 pt-1">{String(n + 1).padStart(2, "0")}</span>
          <div>
            <p className="flex items-center gap-2 text-[15px] font-medium text-ink">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", SEVERITY_CLASSES[i.severity].dot)} aria-hidden />
              {i.title}
            </p>
            <p className="mt-0.5 text-[13px] text-ink-3">{i.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

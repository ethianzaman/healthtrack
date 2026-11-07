import type { Severity } from "@/domain/severity";
import { cn } from "@/lib/utils";

export const SEVERITY_CLASSES: Record<Severity, { badge: string; text: string; border: string; dot: string }> = {
  low: { badge: "bg-sev-low-bg text-sev-low", text: "text-sev-low", border: "border-l-sev-low", dot: "bg-sev-low" },
  normal: { badge: "bg-sev-normal-bg text-sev-normal", text: "text-sev-normal", border: "border-l-sev-normal", dot: "bg-sev-normal" },
  elevated: { badge: "bg-sev-elevated-bg text-sev-elevated", text: "text-sev-elevated", border: "border-l-sev-elevated", dot: "bg-sev-elevated" },
  high: { badge: "bg-sev-high-bg text-sev-high", text: "text-sev-high", border: "border-l-sev-high", dot: "bg-sev-high" },
  critical: { badge: "bg-sev-critical-bg text-sev-critical", text: "text-sev-critical", border: "border-l-sev-critical", dot: "bg-sev-critical" },
};

/** Square-cornered tag with a status dot, like a lab-report flag. */
export function SeverityBadge({ severity, children, className }: { severity: Severity; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-1.5 py-0.5 text-[12px] font-medium",
        SEVERITY_CLASSES[severity].badge,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", SEVERITY_CLASSES[severity].dot)} aria-hidden />
      {children}
    </span>
  );
}

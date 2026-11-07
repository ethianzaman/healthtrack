import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FormStatus = { type: "success" | "error"; message: string } | null;

export function StatusMessage({ status, className }: { status: FormStatus; className?: string }) {
  if (!status) return null;
  const success = status.type === "success";
  return (
    <div
      role={success ? "status" : "alert"}
      className={cn(
        "border-l-2 py-1.5 pl-3 text-sm",
        success ? "border-sev-normal text-sev-normal" : "border-sev-critical text-sev-critical",
        className,
      )}
    >
      <span className="break-all">{status.message}</span>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon ? <div className="mb-3 text-line-strong">{icon}</div> : null}
      <p className="font-display text-lg text-ink-2">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-ink-3">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PageHeader({ title, description, action, eyebrow }: { title: string; description?: string; action?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5 sm:mb-8">
      <div>
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="break-words font-display text-[30px] leading-none tracking-[-0.02em] text-ink sm:text-[40px]">{title}</h1>
        {description ? <p className="mt-2 max-w-xl text-[15px] text-ink-2">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** A metric shown like an instrument readout: mono label, big mono number. */
export function StatCard({ label, value, unit, hint }: { label: string; value: ReactNode; unit?: string; hint?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col justify-between gap-3 bg-surface px-4 py-4 sm:px-5">
      <p className="eyebrow">{label}</p>
      <p className="font-mono text-[24px] font-medium sm:text-[30px] leading-none tracking-[-0.04em] text-ink tabular-nums">
        {value}
        {unit ? <span className="ml-1.5 text-xs font-normal tracking-normal text-ink-3">{unit}</span> : null}
      </p>
      {hint ? <div className="text-[13px] text-ink-3">{hint}</div> : null}
    </div>
  );
}

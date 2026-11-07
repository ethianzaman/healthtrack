import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** White card with a soft border and shadow. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0 rounded-xl border border-line bg-surface shadow-sm", className)} {...props} />;
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line-soft px-4 pb-3 pt-4 sm:px-5">
      <div className="min-w-0">
        <h2 className="font-display text-[19px] leading-tight text-ink">{title}</h2>
        {description ? <p className="mt-1 text-[13px] text-ink-3">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 sm:p-5", className)} {...props} />;
}

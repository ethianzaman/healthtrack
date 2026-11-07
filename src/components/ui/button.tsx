import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-accent text-white shadow-sm hover:bg-accent-ink",
  accent: "bg-accent text-white shadow-sm hover:bg-accent-ink",
  secondary: "bg-surface text-ink border border-line-strong shadow-sm hover:bg-sunken",
  ghost: "text-ink-2 hover:bg-sunken hover:text-ink",
  danger: "bg-surface text-sev-critical border border-sev-critical/30 hover:bg-sev-critical-bg",
} as const;

const sizes = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
  icon: "h-8 w-8",
} as const;

export type ButtonVariant = keyof typeof variants;

export function buttonClasses({ variant = "primary", size = "md", className }: { variant?: ButtonVariant; size?: keyof typeof sizes; className?: string } = {}) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 rounded-md font-medium tracking-[-0.01em] transition-[background-color,border-color,color,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: keyof typeof sizes;
  loading?: boolean;
}

/** Three-dot pulse instead of the usual spinner. */
function Pending() {
  return (
    <span className="inline-flex gap-0.5" aria-hidden>
      {[0, 150, 300].map((d) => (
        <span key={d} className="h-1 w-1 animate-pulse rounded-full bg-current" style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading, className, children, disabled, ...props },
  ref,
) {
  return (
    <button ref={ref} className={buttonClasses({ variant, size, className })} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <Pending /> : null}
      {children}
    </button>
  );
});

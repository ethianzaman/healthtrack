import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const controlBase =
  "block w-full rounded-md border border-line bg-surface px-3 text-base text-ink sm:text-[15px] placeholder:text-ink-3/70 transition-colors hover:border-line-strong focus:border-ink focus:outline-none aria-[invalid=true]:border-sev-critical aria-[invalid=true]:bg-sev-critical-bg/30 disabled:bg-sunken";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, type, ...props }, ref) {
  // Numbers are readings: show them in the data font.
  return <input ref={ref} type={type} className={cn(controlBase, "h-11 sm:h-10", type === "number" && "font-mono tabular-nums", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(controlBase, "min-h-20 py-2", className)} {...props} />;
});

export interface SelectOption {
  value: string | number;
  label: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { options: SelectOption[]; placeholder?: string }>(
  function Select({ className, options, placeholder, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          controlBase,
          "h-11 appearance-none sm:h-10 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22><path d=%22M1 1l4 4 4-4%22 fill=%22none%22 stroke=%22%237e786b%22 stroke-width=%221.5%22/></svg>')] bg-[position:right_12px_center] bg-no-repeat pr-9",
          className,
        )}
        {...props}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  },
);

/**
 * Label + control + hint/error, wired up for accessibility.
 * The render-prop receives the ids to spread onto the control.
 */
export function Field({
  label,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-[13px] font-medium text-ink-2">
        {label}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-sev-critical">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";

export interface Choice<V> {
  value: V;
  label: string;
}

/**
 * One-tap choices (schedule, meal, course length). Tapping the selected chip again clears it
 * when `allowClear` is set. Pair with a text input for values outside the presets.
 */
export function ChoiceChips<V extends string | number | null>({
  choices,
  value,
  onChange,
  allowClear,
  label,
  mono,
}: {
  choices: Choice<V>[];
  value: V | undefined;
  onChange: (value: V | undefined) => void;
  allowClear?: boolean;
  label: string;
  /** Monospace labels for codes like 1+0+1. */
  mono?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {choices.map((c) => {
        const active = value === c.value;
        return (
          <button
            key={String(c.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active && allowClear ? undefined : c.value)}
            className={cn(
              "min-h-9 rounded-full border px-3 text-[13px] transition-colors",
              mono && "font-mono tabular-nums",
              active ? "border-accent bg-accent text-white" : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
            )}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

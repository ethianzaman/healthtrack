"use client";

import { useState } from "react";
import { ComboInput } from "@/components/ui/combo-input";
import { DURATION_PRESETS, formatDuration, parseDuration } from "@/domain/medication";

const DURATION_OPTIONS = DURATION_PRESETS.map((d) => d.label);

/** Course length as text the person can pick or type ("45 days", "2 weeks", "Continue"), stored as days. */
export function DurationField({ value, onChange, inputProps }: { value: number | null | undefined; onChange: (days: number | null) => void; inputProps: object }) {
  const [text, setText] = useState(formatDuration(value));
  const [invalid, setInvalid] = useState(false);
  return (
    <>
      <ComboInput
        {...inputProps}
        aria-invalid={invalid}
        value={text}
        options={DURATION_OPTIONS}
        placeholder="e.g. 14 days"
        onChange={(t) => {
          setText(t);
          const days = parseDuration(t);
          setInvalid(days === undefined);
          if (days !== undefined) onChange(days);
        }}
      />
      {invalid ? <p className="mt-1 text-xs text-sev-critical">Write e.g. 10 days, 2 weeks, 3 months or Continue</p> : null}
    </>
  );
}

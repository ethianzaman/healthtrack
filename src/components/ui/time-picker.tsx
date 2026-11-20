"use client";

import { Clock } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { PickerPanel, pickerTriggerClasses, usePickerPopover } from "./picker-popover";

const PANEL_WIDTH = 288;
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES = Array.from({ length: 60 }, (_, i) => i); // 0..59
const pad = (n: number) => String(n).padStart(2, "0");

/** "HH:mm" (24h) -> 12-hour parts. */
export function splitTime(value: string): { hour: number; minute: number; pm: boolean } | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  return { hour: h % 12 === 0 ? 12 : h % 12, minute: Number(m[2]), pm: h >= 12 };
}

/** 12-hour parts -> "HH:mm" (24h). */
export function joinTime(hour: number, minute: number, pm: boolean): string {
  const h24 = (hour % 12) + (pm ? 12 : 0);
  return `${pad(h24)}:${pad(minute)}`;
}

export function formatTime12(value: string) {
  const t = splitTime(value);
  return t ? `${t.hour}:${pad(t.minute)} ${t.pm ? "PM" : "AM"}` : "";
}

function Column({
  label,
  items,
  selected,
  render,
  onPick,
}: {
  label: string;
  items: number[];
  selected: number | undefined;
  render: (n: number) => string;
  onPick: (n: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  // Bring the current value into view when the picker opens.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "center" });
  }, []);
  return (
    <div className="min-w-0 flex-1">
      <p className="eyebrow mb-1 text-center">{label}</p>
      <div ref={listRef} role="listbox" aria-label={label} className="h-52 snap-y overflow-y-auto overscroll-contain rounded-lg bg-sunken/60 p-1 [scrollbar-width:thin]">
        {items.map((n) => {
          const active = n === selected;
          return (
            <button
              key={n}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onPick(n)}
              className={cn(
                "flex h-10 w-full snap-center items-center justify-center rounded-md font-mono text-[15px] tabular-nums transition-colors",
                active ? "bg-accent font-semibold text-white" : "text-ink hover:bg-accent-soft",
              )}
            >
              {render(n)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface TimePickerProps {
  /** "HH:mm" (24-hour) or "" */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-label"?: string;
  className?: string;
}

/**
 * Time picker with hour / minute / AM-PM columns. Every tap updates the value straight away
 * (no Enter); "Done", Escape or a tap outside closes it.
 */
export function TimePicker({ value, onChange, id, placeholder = "Pick a time", className, ...aria }: TimePickerProps) {
  const { open, alignRight, rootRef, triggerRef, panelId, toggle, close } = usePickerPopover(PANEL_WIDTH);
  const parts = splitTime(value);
  // Missing parts fall back to "now", so the first tap already gives a sensible time.
  const base = () => {
    const now = new Date();
    return parts ?? { hour: now.getHours() % 12 || 12, minute: now.getMinutes(), pm: now.getHours() >= 12 };
  };
  const set = (patch: Partial<{ hour: number; minute: number; pm: boolean }>) => {
    const t = { ...base(), ...patch };
    onChange(joinTime(t.hour, t.minute, t.pm));
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        {...aria}
        className={pickerTriggerClasses(open)}
      >
        <Clock className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
        <span className={cn("min-w-0 flex-1 truncate font-mono tabular-nums", parts ? "text-ink" : "font-sans text-ink-3/70")}>{parts ? formatTime12(value) : placeholder}</span>
      </button>

      {open ? (
        <PickerPanel id={panelId} label="Choose a time" alignRight={alignRight} widthClass="sm:w-72" onDismiss={() => close(false)}>
          <p className="mb-3 text-center font-mono text-[26px] font-medium tabular-nums tracking-[-0.02em] text-ink">{parts ? formatTime12(value) : "--:--"}</p>
          <div className="flex gap-2">
            <Column label="Hour" items={HOURS} selected={parts?.hour} render={String} onPick={(hour) => set({ hour })} />
            <Column label="Minute" items={MINUTES} selected={parts?.minute} render={pad} onPick={(minute) => set({ minute })} />
            <div className="w-16 shrink-0">
              <p className="eyebrow mb-1 text-center">&nbsp;</p>
              <div className="flex flex-col gap-1 rounded-lg bg-sunken/60 p-1" role="radiogroup" aria-label="AM or PM">
                {[false, true].map((pm) => {
                  const active = parts?.pm === pm;
                  return (
                    <button
                      key={String(pm)}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => set({ pm })}
                      className={cn(
                        "h-10 rounded-md font-mono text-[14px] font-medium transition-colors",
                        active ? "bg-accent text-white" : "text-ink hover:bg-accent-soft",
                      )}
                    >
                      {pm ? "PM" : "AM"}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-2">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                onChange(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
              }}
              className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-accent hover:bg-accent-soft"
            >
              Now
            </button>
            <button type="button" onClick={() => close()} className="rounded-md bg-ink px-4 py-1.5 text-[13px] font-medium text-paper hover:bg-ink-hover">
              Done
            </button>
          </div>
        </PickerPanel>
      ) : null}
    </div>
  );
}

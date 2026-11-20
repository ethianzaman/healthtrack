"use client";

import { format, isValid, parse } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { DayPicker, type Matcher } from "react-day-picker";
import { cn } from "@/lib/utils";
import { PickerPanel, pickerTriggerClasses, usePickerPopover } from "./picker-popover";

/** "YYYY-MM-DD" <-> local Date (no time-zone shifts). */
export function parseYmd(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = parse(value, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
}
export const toYmd = (d: Date) => format(d, "yyyy-MM-dd");

const POPOVER_WIDTH = 304;

const calendarClasses = {
  root: "relative select-none",
  months: "relative",
  month: "space-y-3",
  month_caption: "flex h-9 items-center px-1",
  caption_label:
    "inline-flex items-center gap-1 text-[15px] font-semibold text-ink",
  nav: "absolute right-0 top-0 z-10 flex h-9 items-center gap-1",
  button_previous:
    "inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-2 hover:bg-sunken hover:text-ink disabled:opacity-30",
  button_next:
    "inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-2 hover:bg-sunken hover:text-ink disabled:opacity-30",
  dropdowns: "flex items-center gap-2",
  dropdown_root:
    "relative inline-flex items-center rounded-md border border-line px-2 py-1 hover:border-line-strong",
  dropdown: "absolute inset-0 cursor-pointer opacity-0",
  month_grid: "w-full border-collapse",
  weekdays: "flex",
  weekday:
    "w-10 pb-1 text-center font-mono text-[11px] font-normal uppercase text-ink-3",
  week: "flex",
  day: "h-10 w-10 p-0.5 text-center text-sm",
  day_button:
    "h-full w-full rounded-lg font-mono tabular-nums text-ink transition-colors hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-accent",
  selected:
    "[&>button]:bg-accent [&>button]:font-semibold [&>button]:text-white [&>button]:hover:bg-accent-ink",
  today: "[&>button]:ring-1 [&>button]:ring-inset [&>button]:ring-accent",
  outside: "[&>button]:text-ink-3/50",
  disabled: "[&>button]:pointer-events-none [&>button]:text-ink-3/40",
  hidden: "invisible",
  chevron: "h-4 w-4 fill-current",
};

export interface DatePickerProps {
  /** "YYYY-MM-DD" or "" */
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  /** For a plain HTML form: submitted as this field name. */
  name?: string;
  id?: string;
  placeholder?: string;
  /** Allow clearing the value (optional fields). */
  clearable?: boolean;
  /** Month + year dropdowns, for dates far in the past such as a birthday. */
  yearDropdown?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  className?: string;
}

/**
 * Calendar date picker: one click on a day selects it and closes, no Enter needed.
 * Closes on outside click / Escape and returns focus to the field.
 */
export function DatePicker({ value, onChange, min, max, name, id, placeholder = "Pick a date", clearable, yearDropdown, className, ...aria }: DatePickerProps) {
  const { open, alignRight, rootRef, triggerRef, panelId, toggle, close } = usePickerPopover(POPOVER_WIDTH);
  const selected = parseYmd(value);
  const minDate = parseYmd(min);
  const maxDate = parseYmd(max);

  function pick(d: Date | undefined) {
    if (!d) return;
    onChange(toYmd(d));
    close();
  }

  const disabled: Matcher[] = [...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])];
  const today = new Date();
  const todayAllowed = (!minDate || today >= minDate) && (!maxDate || toYmd(today) <= toYmd(maxDate));

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
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
        <CalendarDays className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
        <span className={cn("min-w-0 flex-1 truncate", selected ? "text-ink" : "text-ink-3/70")}>{selected ? format(selected, "EEE, d MMM yyyy") : placeholder}</span>
      </button>
      {clearable && selected ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear date"
          className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}

      {open ? (
        <PickerPanel id={panelId} label="Choose a date" alignRight={alignRight} widthClass="sm:w-76" onDismiss={() => close(false)}>
          <div className="mx-auto w-fit">
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={pick}
              defaultMonth={selected ?? (maxDate && maxDate < today ? maxDate : today)}
              disabled={disabled}
              startMonth={minDate ?? (yearDropdown ? new Date(1920, 0) : undefined)}
              endMonth={maxDate ?? (yearDropdown ? today : undefined)}
              captionLayout={yearDropdown ? "dropdown" : "label"}
              weekStartsOn={6}
              showOutsideDays
              fixedWeeks
              autoFocus
              classNames={calendarClasses}
              components={{
                Chevron: ({ orientation }) =>
                  orientation === "left" ? (
                    <ChevronLeft className="h-4 w-4" />
                  ) : orientation === "right" ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                  ),
              }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
            <button
              type="button"
              disabled={!todayAllowed}
              onClick={() => pick(today)}
              className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-accent hover:bg-accent-soft disabled:opacity-40"
            >
              Today
            </button>
            {clearable ? (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  close();
                }}
                className="rounded-md px-2.5 py-1.5 text-[13px] text-ink-3 hover:bg-sunken hover:text-ink"
              >
                Clear
              </button>
            ) : null}
          </div>
        </PickerPanel>
      ) : null}
    </div>
  );
}

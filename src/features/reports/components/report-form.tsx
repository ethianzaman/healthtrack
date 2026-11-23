"use client";

import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";
import {
  BP_REPORT_COLUMN_LABELS,
  BP_REPORT_COLUMNS,
  GLUCOSE_REPORT_COLUMN_LABELS,
  GLUCOSE_REPORT_COLUMNS,
  REPORT_FORMAT_LABELS,
  REPORT_FORMATS,
  REPORT_SECTION_LABELS,
  REPORT_SECTIONS,
  type ReportFormat,
} from "../schemas";

const PRESETS = [7, 14, 30, 90] as const;

function shift(ymd: string, days: number) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Checkbox group for optional report columns. The hidden "-" marker tells the server the
 * choice was made here, so unticking everything means "no optional columns", not "all".
 */
function ColumnPicker({ legend, hint, name, options }: { legend: string; hint: string; name: string; options: { value: string; label: string }[] }) {
  return (
    <fieldset>
      <legend className="eyebrow mb-1">{legend}</legend>
      <p className="mb-2 text-xs text-ink-3">{hint}</p>
      <input type="hidden" name={name} value="-" />
      <div className="flex flex-col gap-1">
        {options.map((o) => (
          <label key={o.value} className="flex min-h-10 items-center gap-2 text-sm text-ink-2 sm:min-h-8">
            <input type="checkbox" name={name} value={o.value} defaultChecked className="h-4 w-4 accent-accent" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Plain GET form to the report endpoint: works without JS and lets the
 * browser handle the file download natively.
 */
export function ReportForm({ today, allowedFormats, action = "/api/reports" }: { today: string; allowedFormats: ReportFormat[]; action?: string }) {
  const [from, setFrom] = useState(shift(today, 29));
  const [to, setTo] = useState(today);
  const [sections, setSections] = useState<string[]>([...REPORT_SECTIONS]);
  const allChosen = sections.length === REPORT_SECTIONS.length;
  const [format, setFormat] = useState<ReportFormat>("pdf");

  return (
    <form method="GET" action={action} className="space-y-6">
      <div>
        <p className="eyebrow mb-3">Period</p>
        <div className="mb-3 flex flex-wrap gap-6">
          {PRESETS.map((days) => {
            const active = to === today && from === shift(today, days - 1);
            return (
              <button
                key={days}
                type="button"
                onClick={() => {
                  setTo(today);
                  setFrom(shift(today, days - 1));
                }}
                className={cn(
                  "border-b-2 py-2 font-mono text-[13px] tabular-nums transition-colors",
                  active ? "border-accent text-ink" : "border-transparent text-ink-3 hover:text-ink",
                )}
              >
                {days}D
              </button>
            );
          })}
        </div>
        <div className="grid max-w-md grid-cols-1 gap-4 min-[400px]:grid-cols-2">
          <Field label="From">{(a) => <DatePicker name="from" value={from} max={to} onChange={setFrom} {...a} />}</Field>
          <Field label="To">{(a) => <DatePicker name="to" value={to} min={from} max={today} onChange={setTo} {...a} />}</Field>
        </div>
      </div>

      <fieldset>
        <div className="mb-3 flex items-center justify-between gap-3">
          <legend className="eyebrow">Include</legend>
          <button
            type="button"
            onClick={() => setSections(allChosen ? [] : [...REPORT_SECTIONS])}
            className="rounded-md px-2 py-1.5 text-[13px] font-medium text-accent hover:bg-accent-soft"
          >
            {allChosen ? "Clear" : "Select all (full history)"}
          </button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5">
          {REPORT_SECTIONS.map((s) => (
            <label key={s} className="flex min-h-11 items-center gap-2 text-sm text-ink-2 sm:min-h-0">
              <input
                type="checkbox"
                name="sections"
                value={s}
                checked={sections.includes(s)}
                onChange={(e) => setSections((cur) => (e.target.checked ? [...cur, s] : cur.filter((x) => x !== s)))}
                className="h-4 w-4 accent-ink"
              />
              {REPORT_SECTION_LABELS[s]}
            </label>
          ))}
        </div>
      </fieldset>

      {format !== "csv" ? (
        <div className="grid gap-6 sm:grid-cols-2">
          <ColumnPicker
            legend="Blood pressure columns"
            hint="One row per day. Date and the Morning / Night columns are always included."
            name="bpCols"
            options={BP_REPORT_COLUMNS.map((c) => ({ value: c, label: BP_REPORT_COLUMN_LABELS[c] }))}
          />
          <ColumnPicker
            legend="Glucose columns"
            hint="One row per day. Fasting, before / after meal columns and both units (mmol/L or mg/dL) are always included."
            name="glucoseCols"
            options={GLUCOSE_REPORT_COLUMNS.map((c) => ({ value: c, label: GLUCOSE_REPORT_COLUMN_LABELS[c] }))}
          />
        </div>
      ) : null}

      <fieldset>
        <legend className="eyebrow mb-3">Format</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {REPORT_FORMATS.map((f) => {
            const allowed = allowedFormats.includes(f);
            return (
              <label
                key={f}
                className={cn(
                  "relative cursor-pointer rounded-md border p-4 text-sm transition-colors",
                  format === f ? "border-ink bg-surface" : "border-line bg-canvas/40 hover:border-line-strong",
                  !allowed && "cursor-not-allowed opacity-50",
                )}
              >
                <input type="radio" name="format" value={f} checked={format === f} disabled={!allowed} onChange={() => setFormat(f)} className="sr-only" />
                <span className="flex items-center gap-2 font-display text-[18px] text-ink">
                  <span className={cn("h-2 w-2 rounded-full", format === f ? "bg-accent" : "bg-line")} aria-hidden />
                  {REPORT_FORMAT_LABELS[f].label}
                  {!allowed ? <span className="eyebrow ml-auto text-accent!">Pro</span> : null}
                </span>
                <span className="mt-1 block text-xs text-ink-3">{REPORT_FORMAT_LABELS[f].hint}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <button type="submit" className={buttonClasses({ size: "lg", variant: "accent", className: "w-full sm:w-auto" })}>
        Download report <span aria-hidden>&darr;</span>
      </button>
    </form>
  );
}

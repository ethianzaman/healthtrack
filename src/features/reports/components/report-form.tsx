"use client";

import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";
import {
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
 * Plain GET form to the report endpoint: works without JS and lets the
 * browser handle the file download natively.
 */
export function ReportForm({ today, allowedFormats, action = "/api/reports" }: { today: string; allowedFormats: ReportFormat[]; action?: string }) {
  const [from, setFrom] = useState(shift(today, 29));
  const [to, setTo] = useState(today);
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
          <Field label="From">{(a) => <Input type="date" name="from" value={from} max={to} onChange={(e) => setFrom(e.target.value)} required {...a} />}</Field>
          <Field label="To">{(a) => <Input type="date" name="to" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} required {...a} />}</Field>
        </div>
      </div>

      <fieldset>
        <legend className="eyebrow mb-3">Include</legend>
        <div className="flex flex-wrap gap-4">
          {REPORT_SECTIONS.map((s) => (
            <label key={s} className="flex min-h-11 items-center gap-2 text-sm text-ink-2 sm:min-h-0">
              <input type="checkbox" name="sections" value={s} defaultChecked className="h-4 w-4 accent-[#0f172a]" />
              {REPORT_SECTION_LABELS[s]}
            </label>
          ))}
        </div>
      </fieldset>

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

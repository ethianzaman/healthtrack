"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
}

export interface TrendPoint {
  label: string;
  [key: string]: string | number | null;
}

const MONO = "var(--font-data), ui-monospace, monospace";
const AXIS = { fontSize: 10, fill: "#64748b", fontFamily: MONO };

/**
 * Generic time-series chart used for both blood pressure and glucose.
 * Styled like a plotter trace: thin lines, open dots, dashed targets, no chart junk.
 */
export function TrendChart({
  data,
  series,
  references = [],
  unit,
  height = 260,
}: {
  data: TrendPoint[];
  series: TrendSeries[];
  references?: { y: number; label: string; color: string }[];
  unit?: string;
  height?: number;
}) {
  if (data.length < 2) {
    return <p className="py-12 text-center font-display text-[15px] text-ink-3">Two or more readings draw a trend.</p>;
  }
  const visible = series.filter((s) => data.some((d) => d[s.key] != null));
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1">
        {visible.map((s) => (
          <span key={s.key} className="flex items-center gap-2 text-[12px] text-ink-2">
            <span className="h-[2px] w-4" style={{ background: s.color }} aria-hidden />
            {s.label}
          </span>
        ))}
        {references.map((r) => (
          <span key={r.label} className="flex items-center gap-2 font-mono text-[11px] text-ink-3">
            <span className="w-4 border-t border-dashed" style={{ borderColor: r.color }} aria-hidden />
            {r.label}
          </span>
        ))}
      </div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} minTickGap={28} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
            <Tooltip
              cursor={{ stroke: "#0f172a", strokeWidth: 1, strokeDasharray: "2 3" }}
              contentStyle={{ background: "#0f172a", border: "none", borderRadius: 4, fontFamily: MONO, fontSize: 11, color: "#f8fafc" }}
              labelStyle={{ color: "#f8fafc", opacity: 0.6, marginBottom: 4 }}
              itemStyle={{ color: "#f8fafc", padding: 0 }}
              formatter={(value, name) => [`${value}${unit ? ` ${unit}` : ""}`, name]}
            />
            {references.map((r) => (
              <ReferenceLine
                key={r.label}
                y={r.y}
                stroke={r.color}
                strokeDasharray="2 4"
              />
            ))}
            {visible.map((s) => (
              <Line
                key={s.key}
                type="linear"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={1.75}
                dot={{ r: 2.5, fill: "#ffffff", strokeWidth: 1.5 }}
                activeDot={{ r: 4, fill: s.color, strokeWidth: 0 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

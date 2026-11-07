import { TrendChart } from "@/components/charts/trend-chart";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/feedback";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { bpCategoryLabel, classifyBloodPressure } from "@/domain/blood-pressure";
import { TIME_OF_DAY_LABELS } from "@/domain/enums";
import { formatGlucose, fromMgDl } from "@/domain/glucose";
import type { NumberStats } from "@/domain/stats";
import { BP_SERIES, bpTrendData, GLUCOSE_SERIES, glucoseTrendData } from "@/lib/chart-data";
import type { HealthData } from "@/server/services/health-data.service";
import { InsightList } from "./insight-list";

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Summary of a period: key numbers, morning/evening & before/after-meal breakdown,
 * trends and insights. Shared by the dashboard and the doctor share page.
 */
export function HealthOverview({ data, timeZone }: { data: HealthData; timeZone: string }) {
  const { bp, glucose, profile } = data;
  const unit = profile.glucoseUnit;
  const unitLabel = unit === "MMOL_L" ? "mmol/L" : "mg/dL";
  const g = (s: NumberStats) => (s.avg == null ? null : formatGlucose(s.avg, unit, false));
  const bpAvg = bp.summary.systolic.avg != null ? classifyBloodPressure(bp.summary.systolic.avg, bp.summary.diastolic.avg!) : null;
  const worst = bp.summary.worstCategory;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Readout strip */}
      <Card className="grid grid-cols-2 gap-px overflow-hidden bg-line lg:grid-cols-4">
        <StatCard
          label="Avg blood pressure"
          value={bpAvg ? `${Math.round(bp.summary.systolic.avg!)}/${Math.round(bp.summary.diastolic.avg!)}` : "--"}
          unit={bpAvg ? "mmHg" : undefined}
          hint={bpAvg ? <SeverityBadge severity={bpAvg.severity}>{bpAvg.label}</SeverityBadge> : `${bp.summary.count} readings`}
        />
        <StatCard
          label="BP on target"
          value={bp.summary.onTargetPct != null ? bp.summary.onTargetPct : "--"}
          unit={bp.summary.onTargetPct != null ? "%" : undefined}
          hint={worst ? `Peak: ${bpCategoryLabel(worst).toLowerCase()}` : `Target < ${profile.bpSystolicTarget}/${profile.bpDiastolicTarget}`}
        />
        <StatCard
          label="Avg glucose"
          value={glucose.summary.overall.avg != null ? formatGlucose(glucose.summary.overall.avg, unit, false) : "--"}
          unit={glucose.summary.overall.avg != null ? unitLabel : undefined}
          hint={glucose.summary.inRangePct != null ? `${glucose.summary.inRangePct}% in target range` : `${glucose.summary.count} readings`}
        />
        <StatCard
          label="Est. A1C"
          value={glucose.summary.estimatedA1c != null ? glucose.summary.estimatedA1c : "--"}
          unit={glucose.summary.estimatedA1c != null ? "%" : undefined}
          hint={glucose.summary.estimatedA1c != null ? "Indicative, from average" : "Needs 10+ readings"}
        />
      </Card>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Blood pressure" description="Average systolic / diastolic by time of day, mmHg" />
          <MatrixTable
            head={["", "Count", "Sys", "Dia"]}
            rows={bp.summary.byTimeOfDay.map((p) => [TIME_OF_DAY_LABELS[p.timeOfDay], String(p.count), String(Math.round(p.systolicAvg!)), String(Math.round(p.diastolicAvg!))])}
          />
        </Card>
        <Card>
          <CardHeader title="Glucose around meals" description={`Fasting or before meal vs 2h after, ${unitLabel}`} />
          <MatrixTable
            head={["", "Before meal", "After meal"]}
            rows={glucose.summary.slots.map((s) => [TIME_OF_DAY_LABELS[s.timeOfDay], g(s.before) ?? "--", g(s.after) ?? "--"])}
          />
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Pressure trace" />
          <CardBody>
            <TrendChart
              data={bpTrendData(bp.readings, timeZone)}
              series={BP_SERIES}
              unit="mmHg"
              references={[
                { y: profile.bpSystolicTarget, label: `target ${profile.bpSystolicTarget}`, color: "#0f766e" },
                { y: profile.bpDiastolicTarget, label: `target ${profile.bpDiastolicTarget}`, color: "#64748b" },
              ]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Glucose trace" />
          <CardBody>
            <TrendChart
              data={glucoseTrendData(glucose.readings, unit, timeZone)}
              series={GLUCOSE_SERIES}
              unit={unitLabel}
              references={[
                { y: round1(fromMgDl(profile.glucosePostMealMax, unit)), label: "after-meal max", color: "#ea580c" },
                { y: round1(fromMgDl(profile.glucoseLow, unit)), label: "low", color: "#1d4ed8" },
              ]}
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Observations" description="Generated from this period. Worth raising at your next appointment." />
        <CardBody>
          <InsightList insights={[...bp.insights, ...glucose.insights]} />
        </CardBody>
      </Card>
    </div>
  );
}

/** Row-label + numeric columns in mono, like a printed lab table. */
function MatrixTable({ head, rows }: { head: string[]; rows: string[][] }) {
  if (rows.length === 0) return <p className="px-5 py-10 text-center font-display text-[15px] text-ink-3">No readings in this period.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line-soft">
          {head.map((h, i) => (
            <th key={i} className={`eyebrow whitespace-nowrap px-3 py-2 font-normal first:pl-4 sm:px-5 ${i === 0 ? "text-left" : "text-right"}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-line-soft">
        {rows.map((r) => (
          <tr key={r[0]}>
            {r.map((c, i) => (
              <td key={i} className={i === 0 ? "py-3 pl-4 pr-2 font-display text-[16px] text-ink sm:px-5" : "px-3 py-3 text-right font-mono sm:px-5 text-[15px] tabular-nums text-ink"}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

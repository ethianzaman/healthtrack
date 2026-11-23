import type { Metadata } from "next";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader, StatusMessage } from "@/components/ui/feedback";
import { planLimits } from "@/config/plans";
import { ReportForm } from "@/features/reports/components/report-form";
import { requireAppContext } from "@/server/auth/context";
import { todayYmd } from "@/server/reports/report.service";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user, profile } = await requireAppContext();
  const { error } = await searchParams;

  return (
    <>
      <PageHeader eyebrow="Logbook · 07" title="Reports" description={`Doctor-ready report for ${profile.name}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader title="Generate report" />
          <CardBody>
            {error ? <StatusMessage className="mb-4" status={{ type: "error", message: error }} /> : null}
            <ReportForm today={todayYmd(user.timezone)} allowedFormats={planLimits(user.plan).reportFormats} />
          </CardBody>
        </Card>
        <Card className="h-fit">
          <CardHeader title="What's inside" />
          <CardBody>
            <ol className="space-y-2.5 text-sm text-ink-2">
              {[
                "Health Summary: conditions, current treatment and what changed in the period",
                "Blood Pressure Report: one row per day, morning and night side by side",
                "Glucose Report: fasting, before and after meals on one row per day",
                "Values in mmol/L or mg/dL, with the time beside each reading",
                "A Status column for every day: Normal, High or Danger (ACC/AHA, ADA)",
                "Medication list on its own page",
              ].map((item, i) => (
                <li key={item} className="grid grid-cols-[24px_1fr]">
                  <span className="font-mono text-[11px] text-accent">{String(i + 1).padStart(2, "0")}</span>
                  {item}
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import { TrendChart } from "@/components/charts/trend-chart";
import { parseRangeDays, RangeTabs } from "@/components/range-tabs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/feedback";
import { GlucoseForm } from "@/features/glucose/components/glucose-form";
import { GlucoseTable } from "@/features/glucose/components/glucose-table";
import { GLUCOSE_SERIES, glucoseTrendData } from "@/lib/chart-data";
import { lastDaysRange } from "@/lib/dates";
import { requireAppContext } from "@/server/auth/context";
import { glucoseRepository } from "@/server/repositories/reading.repository";
import { glucoseTargetsOf } from "@/server/services/profile.service";

export const metadata: Metadata = { title: "Blood glucose" };

export default async function GlucosePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { user, profile } = await requireAppContext();
  const days = parseRangeDays((await searchParams).days);
  const readings = await glucoseRepository.list(profile.id, lastDaysRange(days, user.timezone));
  const targets = glucoseTargetsOf(profile);
  const unit = profile.glucoseUnit;

  return (
    <>
      <PageHeader eyebrow="Logbook · 03" title="Blood glucose" description="Fasting on waking, then before and two hours after your main meals." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        <Card className="h-fit">
          <CardHeader title="Log a reading" description={`For ${profile.name}`} />
          <CardBody>
            <GlucoseForm unit={unit} targets={targets} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Trend" action={<RangeTabs basePath="/glucose" active={days} />} />
          <CardBody>
            <TrendChart
              data={glucoseTrendData([...readings].reverse(), unit, user.timezone)}
              series={GLUCOSE_SERIES}
              unit={unit === "MMOL_L" ? "mmol/L" : "mg/dL"}
            />
          </CardBody>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader title="History" description={`${readings.length} readings in the last ${days} days`} />
        <GlucoseTable readings={readings} unit={unit} targets={targets} timeZone={user.timezone} editable />
      </Card>
    </>
  );
}

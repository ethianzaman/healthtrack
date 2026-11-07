import type { Metadata } from "next";
import { TrendChart } from "@/components/charts/trend-chart";
import { parseRangeDays, RangeTabs } from "@/components/range-tabs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/feedback";
import { BpForm } from "@/features/blood-pressure/components/bp-form";
import { BpTable } from "@/features/blood-pressure/components/bp-table";
import { BP_SERIES, bpTrendData } from "@/lib/chart-data";
import { lastDaysRange } from "@/lib/dates";
import { requireAppContext } from "@/server/auth/context";
import { bloodPressureRepository } from "@/server/repositories/reading.repository";

export const metadata: Metadata = { title: "Blood pressure" };

export default async function BloodPressurePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { user, profile } = await requireAppContext();
  const days = parseRangeDays((await searchParams).days);
  const readings = await bloodPressureRepository.list(profile.id, lastDaysRange(days, user.timezone));

  return (
    <>
      <PageHeader eyebrow="Logbook · 02" title="Blood pressure" description="Sit for five minutes, arm at heart level, no coffee in the last half hour. Twice a day." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        <Card className="h-fit">
          <CardHeader title="Log a reading" description={`For ${profile.name}`} />
          <CardBody>
            <BpForm />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Trend" action={<RangeTabs basePath="/blood-pressure" active={days} />} />
          <CardBody>
            <TrendChart data={bpTrendData([...readings].reverse(), user.timezone)} series={BP_SERIES} unit="mmHg" />
          </CardBody>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader title="History" description={`${readings.length} readings in the last ${days} days`} />
        <BpTable readings={readings} timeZone={user.timezone} editable />
      </Card>
    </>
  );
}

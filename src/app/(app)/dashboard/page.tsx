import type { Metadata } from "next";
import Link from "next/link";
import { parseRangeDays, RangeTabs } from "@/components/range-tabs";
import { buttonClasses } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/feedback";
import { HealthOverview } from "@/features/dashboard/components/health-overview";
import { lastDaysRange } from "@/lib/dates";
import { requireAppContext } from "@/server/auth/context";
import { loadHealthData } from "@/server/services/health-data.service";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { user, profile } = await requireAppContext();
  const days = parseRangeDays((await searchParams).days);
  const data = await loadHealthData(profile, lastDaysRange(days, user.timezone), { bp: true, glucose: true });

  return (
    <>
      <PageHeader
        eyebrow={`Logbook · last ${days} days`}
        title={profile.name}
        description={profile.relation === "Self" ? "Your numbers at a glance." : `${profile.relation}'s numbers at a glance.`}
        action={
          <div className="flex w-full flex-wrap items-center justify-between gap-x-5 gap-y-3 sm:w-auto">
            <RangeTabs basePath="/dashboard" active={days} />
            <div className="flex gap-2">
              <Link href="/blood-pressure" className={buttonClasses({ variant: "secondary", size: "sm" })}>
                + Pressure
              </Link>
              <Link href="/glucose" className={buttonClasses({ size: "sm" })}>
                + Glucose
              </Link>
            </div>
          </div>
        }
      />
      <HealthOverview data={data} timeZone={user.timezone} />
    </>
  );
}

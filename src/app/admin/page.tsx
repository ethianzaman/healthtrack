import Link from "next/link";
import { TrendChart } from "@/components/charts/trend-chart";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader, StatCard } from "@/components/ui/feedback";
import { dailyActivitySeries } from "@/lib/activity-series";
import { requireAdmin } from "@/server/auth/admin";
import { adminService } from "@/server/services/admin.service";

const SERIES = [
  { key: "LOGIN", label: "Sign-ins", color: "#0f766e" },
  { key: "REGISTER", label: "Sign-ups", color: "#ea580c" },
  { key: "REPORT_DOWNLOAD", label: "Report downloads", color: "#1d4ed8" },
];

export default async function AdminOverviewPage() {
  const admin = await requireAdmin();
  const o = await adminService.overview();
  const daily = dailyActivitySeries(o.events, SERIES.map((s) => s.key), 30, admin.timezone);
  const downloads = Object.values(o.downloadsByFormat).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Overview" description="Who is using HealthTrack, and how - last 30 days." />
      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
        <StatCard label="Accounts" value={o.users} hint={`${o.signups30} new in 30 days`} />
        <StatCard label="Active, 7 days" value={o.active7} hint={`${o.active30} in 30 days`} />
        <StatCard label="Reports, 30 days" value={downloads} hint={Object.entries(o.downloadsByFormat).map(([f, n]) => `${f.toUpperCase()} ${n}`).join(" · ") || "none yet"} />
        <StatCard
          label="Needs attention"
          value={o.suspended + o.warned}
          hint={
            <Link href="/admin/users?status=SUSPENDED" className="underline-offset-4 hover:underline">
              {o.suspended} suspended · {o.warned} warned
            </Link>
          }
        />
      </div>
      <Card>
        <CardHeader title="Daily activity" description="Sign-ins, sign-ups and report downloads per day" />
        <CardBody>
          <TrendChart data={daily} series={SERIES} height={280} />
        </CardBody>
      </Card>
    </>
  );
}

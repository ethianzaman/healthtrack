import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { BpTable } from "@/features/blood-pressure/components/bp-table";
import { HealthOverview } from "@/features/dashboard/components/health-overview";
import { GlucoseTable } from "@/features/glucose/components/glucose-table";
import { ageFrom, formatDate, formatDateTime, lastDaysRange } from "@/lib/dates";
import { loadHealthData } from "@/server/services/health-data.service";
import { shareService } from "@/server/services/share.service";

const SHARE_WINDOW_DAYS = 90;

// Never index patient data.
export const metadata: Metadata = { title: "Shared health report", robots: { index: false, follow: false } };

export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await shareService.resolve(token);
  if (!shared) notFound();

  const { profile, timezone, link } = shared;
  const range = lastDaysRange(SHARE_WINDOW_DAYS, timezone);
  const data = await loadHealthData(profile, range);
  const age = ageFrom(profile.dateOfBirth);
  const reportHref = `/api/share/${token}/report?from=${range.fromYmd}&to=${range.toYmd}&format=pdf&sections=bp&sections=glucose&sections=medications`;

  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Logo />
          <span className="eyebrow">
            Read-only link for {link.label} - expires {formatDateTime(link.expiresAt, timezone)}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Shared logbook · read only</p>
            <h1 className="font-display text-[40px] leading-none tracking-[-0.02em] text-ink">{profile.name}</h1>
            <p className="mt-2 font-mono text-[13px] text-ink-3">
              {age != null ? `${age} years - ` : ""}
              {formatDate(range.from, timezone)} to {formatDate(new Date(range.to.getTime() - 1), timezone)}
            </p>
          </div>
          <a href={reportHref} className={buttonClasses()}>
            Download PDF <span aria-hidden>&darr;</span>
          </a>
        </div>

        <HealthOverview data={data} timeZone={timezone} />

        <Card>
          <CardHeader title="Blood pressure readings" />
          <BpTable readings={[...data.bp.readings].reverse()} timeZone={timezone} />
        </Card>
        <Card>
          <CardHeader title="Glucose readings" />
          <GlucoseTable readings={[...data.glucose.readings].reverse()} unit={profile.glucoseUnit} targets={data.glucose.targets} timeZone={timezone} />
        </Card>
        {data.medications.length > 0 ? (
          <Card>
            <CardHeader title="Active medications" />
            <ul className="divide-y divide-line-soft text-sm">
              {data.medications.map((m) => (
                <li key={m.id} className="px-5 py-3">
                  <span className="font-medium text-ink">{m.name}</span> {m.dosage} - {m.schedule}
                  {m.notes ? <span className="text-ink-3"> ({m.notes})</span> : null}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        <p className="text-center text-xs text-ink-3">{siteConfig.disclaimer}</p>
      </main>
    </div>
  );
}

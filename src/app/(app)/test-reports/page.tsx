import type { Metadata } from "next";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/feedback";
import { LabReportCard } from "@/features/lab-reports/components/lab-report-card";
import { LabReportForm } from "@/features/lab-reports/components/lab-report-form";
import { toLabReportView, toPrescriptionOptions } from "@/features/lab-reports/view";
import { requireAppContext } from "@/server/auth/context";
import { labReportRepository } from "@/server/repositories/lab-report.repository";

export const metadata: Metadata = { title: "Test reports" };

export default async function TestReportsPage() {
  const { profile } = await requireAppContext();
  const [reports, prescriptionRows] = await Promise.all([labReportRepository.list(profile.id), labReportRepository.prescriptionsForPicker(profile.id)]);
  const prescriptions = toPrescriptionOptions(prescriptionRows);
  const pastTitles = [...new Set(reports.map((r) => r.title))];
  const labs = [...new Set(reports.map((r) => r.labName).filter((l): l is string => Boolean(l)))];
  const views = reports.map(toLabReportView);

  // Group by year of the test so a long history stays easy to scan.
  const groups = new Map<string, typeof views>();
  for (const v of views) {
    const key = v.testDate?.slice(0, 4) ?? "No date";
    groups.set(key, [...(groups.get(key) ?? []), v]);
  }

  return (
    <>
      <PageHeader eyebrow="Logbook · 05" title="Test reports" description="Keep every blood test, X-ray and scan in one place, with the doctor who asked for it." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,460px)_1fr]">
        <Card className="h-fit">
          <CardHeader title="Add a test report" description={`For ${profile.name}. Photograph each page or upload the lab's PDF.`} />
          <CardBody>
            <LabReportForm prescriptions={prescriptions} pastTitles={pastTitles} labs={labs} />
          </CardBody>
        </Card>
        <Card className="h-fit">
          <CardHeader title={`All test reports (${reports.length})`} />
          {reports.length === 0 ? (
            <EmptyState title="No test reports yet" description="Reports you add appear here, newest first." />
          ) : (
            <CardBody className="space-y-6">
              {[...groups].map(([year, list]) => (
                <section key={year} className="space-y-3">
                  <h3 className="eyebrow">{year}</h3>
                  {list.map((r) => (
                    <LabReportCard key={r.id} report={r} prescriptions={prescriptions} pastTitles={pastTitles} labs={labs} />
                  ))}
                </section>
              ))}
            </CardBody>
          )}
        </Card>
      </div>
    </>
  );
}

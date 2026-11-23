"use client";

import { ChevronLeft, ChevronRight, Download, ExternalLink, FileText, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { deleteLabReport } from "../actions";
import { LabReportForm, type EditableLabReport, type PrescriptionOption } from "./lab-report-form";

export interface LabReportView extends EditableLabReport {
  /** Already formatted on the server. */
  dateLabel: string | null;
  doctorLabel: string | null;
}

/**
 * One test report: details, page thumbnails and a viewer. The owner also gets Edit and Delete;
 * on a doctor's share link it is read-only and files come through the link's own route.
 */
export function LabReportCard({
  report,
  fileBase = "/api/lab-reports/files/",
  readOnly = false,
  prescriptions = [],
  pastTitles,
  labs,
}: {
  report: LabReportView;
  /** Prefix for a file id, e.g. "/api/share/{token}/lab-files/". */
  fileBase?: string;
  readOnly?: boolean;
  prescriptions?: PrescriptionOption[];
  pastTitles?: string[];
  labs?: string[];
}) {
  const router = useRouter();
  const [viewing, setViewing] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, startDelete] = useTransition();
  const files = report.files;
  const meta = [report.dateLabel, report.labName].filter(Boolean).join(" · ");

  return (
    <article className="rounded-xl border border-line p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-ink">{report.title}</h3>
          {meta ? <p className="font-mono text-[12px] text-ink-3">{meta}</p> : null}
          {report.doctorLabel ? <p className="text-[13px] text-ink-2">Asked by {report.doctorLabel}</p> : null}
          {report.notes ? <p className="mt-1 whitespace-pre-line text-[13px] text-ink-2">{report.notes}</p> : null}
        </div>
        {readOnly ? null : (
          <div className="flex items-center gap-1">
            <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={`Delete ${report.title}`}
              loading={deleting}
              onClick={() => {
                if (!window.confirm(`Delete "${report.title}" and all its pages?`)) return;
                startDelete(async () => {
                  const result = await deleteLabReport({ id: report.id });
                  if (!result.ok) window.alert(result.error);
                  router.refresh();
                });
              }}
            >
              {deleting ? null : <Trash2 className="h-4 w-4 text-ink-3" />}
            </Button>
          </div>
        )}
      </div>

      {files.length ? (
        <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {files.map((f, i) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => setViewing(i)}
                aria-label={`Open page ${i + 1}: ${f.name}`}
                className="block aspect-[3/4] w-full overflow-hidden rounded-lg border border-line bg-sunken transition hover:border-accent focus-visible:border-accent"
              >
                {f.mimeType === "application/pdf" ? (
                  <span className="flex h-full flex-col items-center justify-center gap-1">
                    <FileText className="h-6 w-6 text-ink-3" />
                    <span className="font-mono text-[10px] uppercase text-ink-3">PDF</span>
                  </span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- private, auth-protected file
                  <img src={`${fileBase}${f.id}?thumb=1`} alt={`Page ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[13px] text-ink-3">No pages added yet.</p>
      )}

      <Dialog open={viewing !== null} onClose={() => setViewing(null)} title={report.title} description={viewing !== null ? `Page ${viewing + 1} of ${files.length}` : undefined} wide>
        {viewing !== null && files[viewing] ? <PageViewer file={files[viewing]} src={fileBase + files[viewing].id} index={viewing} count={files.length} onMove={setViewing} /> : null}
      </Dialog>

      {readOnly ? null : (
        <Dialog
          open={editing}
          onClose={() => {
            setEditing(false);
            router.refresh();
          }}
          title="Edit test report"
        >
          <LabReportForm
            report={report}
            prescriptions={prescriptions}
            pastTitles={pastTitles}
            labs={labs}
            onDone={() => {
              setEditing(false);
              router.refresh();
            }}
          />
        </Dialog>
      )}
    </article>
  );
}

function PageViewer({
  file,
  src,
  index,
  count,
  onMove,
}: {
  file: { id: string; name: string; mimeType: string };
  src: string;
  index: number;
  count: number;
  onMove: (i: number) => void;
}) {
  const isPdf = file.mimeType === "application/pdf";
  return (
    <div
      className="space-y-3"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" && index < count - 1) onMove(index + 1);
        if (e.key === "ArrowLeft" && index > 0) onMove(index - 1);
      }}
    >
      <div className="flex min-h-[50dvh] items-center justify-center overflow-hidden rounded-lg bg-sunken">
        {isPdf ? (
          <>
            <iframe src={src} title={file.name} className="hidden h-[70dvh] w-full md:block" />
            <div className="flex flex-col items-center gap-3 p-6 text-center md:hidden">
              <FileText className="h-10 w-10 text-ink-3" />
              <p className="text-sm text-ink-2">{file.name}</p>
              <a href={src} target="_blank" rel="noreferrer" className={buttonClasses({ variant: "secondary" })}>
                Open PDF
              </a>
            </div>
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- private, auth-protected file
          <img src={src} alt={file.name} className="max-h-[70dvh] w-auto max-w-full object-contain" />
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="secondary" disabled={index === 0} onClick={() => onMove(index - 1)} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button type="button" size="sm" variant="secondary" disabled={index >= count - 1} onClick={() => onMove(index + 1)} aria-label="Next page">
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-1">
          <a href={src} target="_blank" rel="noreferrer" className={buttonClasses({ variant: "ghost", size: "sm" })}>
            <ExternalLink className="h-3.5 w-3.5" /> Full size
          </a>
          <a href={`${src}?download=1`} className={buttonClasses({ variant: "ghost", size: "sm" })}>
            <Download className="h-3.5 w-3.5" /> Download
          </a>
        </div>
      </div>
    </div>
  );
}

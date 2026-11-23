"use client";

import { Camera, FileText, ImagePlus, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ComboInput } from "@/components/ui/combo-input";
import { DatePicker, toYmd } from "@/components/ui/date-picker";
import { StatusMessage } from "@/components/ui/feedback";
import { Field, Select, Textarea } from "@/components/ui/form-controls";
import { COMMON_TESTS, LAB_FILE_MAX_BYTES, LAB_FILES_PER_REPORT } from "@/domain/lab-reports";
import { optionalString, useActionForm } from "@/hooks/use-action-form";
import type { ActionResult } from "@/lib/action-result";
import { makeThumbnail, prepareUpload } from "@/lib/image-compress";
import { cn } from "@/lib/utils";
import { createLabReport, deleteLabReportFile, updateLabReport } from "../actions";
import { labReportSchema, type LabReportInput } from "../schemas";

export interface PrescriptionOption {
  id: string;
  label: string;
}

/** What the edit form needs of an existing report (plain values, safe to pass from the server). */
export interface EditableLabReport {
  id: string;
  title: string;
  testDate: string | null;
  labName: string | null;
  prescriptionId: string | null;
  notes: string | null;
  files: { id: string; name: string; mimeType: string }[];
}

type PendingFile = { key: string; file: File; preview: string | null; state: "waiting" | "uploading" | "done" | "error"; error?: string };

async function uploadOne(reportId: string, file: File): Promise<string | null> {
  const body = new FormData();
  body.append("file", file, file.name);
  const thumb = await makeThumbnail(file);
  if (thumb) body.append("thumb", thumb, "thumb.jpg");
  try {
    const res = await fetch(`/api/lab-reports/${reportId}/files`, { method: "POST", body });
    if (res.ok) return null;
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    return data?.error ?? `Upload failed (${res.status})`;
  } catch {
    return "No connection. Try again.";
  }
}

/**
 * Add or edit a test report: details plus any number of photos (camera or gallery) or PDFs.
 * Details are saved first, then each file is uploaded on its own; if one fails, pressing Save
 * again retries only the files that didn't go through (no duplicate report).
 */
export function LabReportForm({
  report,
  prescriptions,
  pastTitles = [],
  labs = [],
  onDone,
}: {
  report?: EditableLabReport;
  prescriptions: PrescriptionOption[];
  pastTitles?: string[];
  labs?: string[];
  onDone?: () => void;
}) {
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const router = useRouter();
  const savedId = useRef<string | null>(report?.id ?? null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const existing = (report?.files ?? []).filter((f) => !removed.includes(f.id));
  const room = LAB_FILES_PER_REPORT - existing.length - pending.filter((p) => p.state !== "done").length;

  // Free preview URLs when files go away.
  const previews = useRef(new Set<string>());
  useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const setFile = (key: string, patch: Partial<PendingFile>) => setPending((list) => list.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  async function save(values: LabReportInput): Promise<ActionResult<{ id: string }>> {
    const result = savedId.current ? await updateLabReport({ ...values, id: savedId.current }) : await createLabReport(values);
    if (!result.ok) return result;
    savedId.current = result.data.id;

    let failed = 0;
    for (const p of pending) {
      if (p.state === "done") continue;
      setFile(p.key, { state: "uploading", error: undefined });
      const prepared = await prepareUpload(p.file);
      const error = prepared.size > LAB_FILE_MAX_BYTES ? "Too large (max 4 MB)" : await uploadOne(result.data.id, prepared);
      setFile(p.key, error ? { state: "error", error } : { state: "done" });
      if (error) failed++;
    }
    if (failed) {
      return { ok: false, error: `Details saved, but ${failed} ${failed === 1 ? "file" : "files"} did not upload. Press Save again to retry.` };
    }
    return { ok: true, data: result.data, message: report ? "Test report updated" : "Test report saved" };
  }

  const { form, onSubmit, status, errorOf, isSubmitting } = useActionForm({
    schema: labReportSchema,
    action: save,
    defaultValues: {
      title: report?.title ?? "",
      testDate: report?.testDate ?? undefined,
      labName: report?.labName ?? undefined,
      prescriptionId: report?.prescriptionId ?? undefined,
      notes: report?.notes ?? undefined,
    },
    resetOnSuccess: !report,
    onSuccess: () => {
      pending.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
      setPending([]);
      if (!report) savedId.current = null; // next report starts fresh
      onDone?.();
    },
  });
  const { register, control } = form;

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const files = [...list].slice(0, Math.max(0, room));
    setPending((cur) => [
      ...cur,
      ...files.map((file) => {
        const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
        if (preview) previews.current.add(preview);
        return { key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`, file, preview, state: "waiting" as const };
      }),
    ]);
  }

  async function removeExisting(id: string) {
    if (!window.confirm("Remove this page from the report?")) return;
    setRemoving(id);
    const result = await deleteLabReportFile({ id });
    setRemoving(null);
    if (!result.ok) return window.alert(result.error);
    setRemoved((ids) => [...ids, id]);
    router.refresh();
  }

  const titleOptions = [...new Set([...pastTitles, ...COMMON_TESTS])];
  const prescriptionOptions = prescriptions.map((p) => ({ value: p.id, label: p.label }));

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Test name" error={errorOf("title")} className="sm:col-span-2">
          {(a) => (
            <Controller
              control={control}
              name="title"
              render={({ field }) => <ComboInput {...a} name={field.name} value={field.value ?? ""} onChange={field.onChange} options={titleOptions} placeholder="e.g. HbA1c, Lipid profile" />}
            />
          )}
        </Field>
        <Field label="Test date" error={errorOf("testDate")}>
          {(a) => (
            <Controller
              control={control}
              name="testDate"
              render={({ field }) => <DatePicker {...a} value={field.value ?? ""} onChange={(v) => field.onChange(v || undefined)} max={toYmd(new Date())} clearable />}
            />
          )}
        </Field>
        <Field label="Lab or hospital (optional)" error={errorOf("labName")}>
          {(a) => (
            <Controller
              control={control}
              name="labName"
              render={({ field }) => (
                <ComboInput {...a} name={field.name} value={field.value ?? ""} onChange={(v) => field.onChange(v || undefined)} options={labs} placeholder="Where it was done" />
              )}
            />
          )}
        </Field>
        <Field label="Asked by (prescription)" error={errorOf("prescriptionId")} hint={prescriptions.length ? undefined : "Prescriptions you add under Medications appear here."} className="sm:col-span-2">
          {(a) => <Select {...a} placeholder="Not linked to a prescription" options={prescriptionOptions} {...register("prescriptionId", optionalString)} />}
        </Field>
        <Field label="Notes (optional)" error={errorOf("notes")} className="sm:col-span-2">
          {(a) => <Textarea rows={2} placeholder="e.g. HbA1c 7.2%, doctor said continue the same medicines" {...a} {...register("notes", optionalString)} />}
        </Field>
      </div>

      <div className="space-y-2">
        <p className="text-[13px] font-medium text-ink-2">Report pages</p>
        {existing.length || pending.length ? (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {existing.map((f) => (
              <li key={f.id} className="relative aspect-[3/4] overflow-hidden rounded-lg border border-line bg-sunken">
                <Thumb src={`/api/lab-reports/files/${f.id}?thumb=1`} isPdf={f.mimeType === "application/pdf"} name={f.name} />
                <RemoveButton label={`Remove ${f.name}`} busy={removing === f.id} onClick={() => removeExisting(f.id)} />
              </li>
            ))}
            {pending.map((p) => (
              <li key={p.key} className={cn("relative aspect-[3/4] overflow-hidden rounded-lg border bg-sunken", p.state === "error" ? "border-sev-critical" : "border-line")}>
                <Thumb src={p.preview} isPdf={p.file.type === "application/pdf"} name={p.file.name} />
                {p.state === "uploading" ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-surface/60">
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                  </span>
                ) : null}
                {p.state === "done" ? <span className="absolute bottom-1 left-1 rounded bg-sev-normal px-1.5 py-0.5 text-[10px] font-medium text-white">Uploaded</span> : null}
                {p.state === "error" ? <span className="absolute inset-x-0 bottom-0 bg-sev-critical px-1.5 py-1 text-[10px] leading-tight text-white">{p.error}</span> : null}
                {p.state === "waiting" || p.state === "error" ? (
                  <RemoveButton
                    label={`Remove ${p.file.name}`}
                    onClick={() => {
                      if (p.preview) URL.revokeObjectURL(p.preview);
                      setPending((list) => list.filter((x) => x.key !== p.key));
                    }}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={room <= 0 || isSubmitting} onClick={() => cameraRef.current?.click()}>
            <Camera className="h-4 w-4" /> Take a photo
          </Button>
          <Button type="button" variant="secondary" disabled={room <= 0 || isSubmitting} onClick={() => pickerRef.current?.click()}>
            <ImagePlus className="h-4 w-4" /> Choose photos or PDF
          </Button>
        </div>
        <p className="text-xs text-ink-3">Add every page. Photos are shrunk before upload; PDF up to 4 MB. Up to {LAB_FILES_PER_REPORT} pages per report.</p>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={pickerRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <StatusMessage status={status} />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={isSubmitting}>
          {report ? "Save changes" : "Save test report"}
        </Button>
        {onDone && report ? (
          <Button type="button" variant="ghost" onClick={onDone} disabled={isSubmitting}>
            Close
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function Thumb({ src, isPdf, name }: { src: string | null; isPdf: boolean; name: string }) {
  if (isPdf || !src) {
    return (
      <span className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
        <FileText className="h-7 w-7 text-ink-3" />
        <span className="line-clamp-2 break-all text-[11px] text-ink-3">{name}</span>
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- private, auth-protected files; next/image can't optimise them
  return <img src={src} alt={name} loading="lazy" className="h-full w-full object-cover" />;
}

function RemoveButton({ label, onClick, busy }: { label: string; onClick: () => void; busy?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={busy}
      className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-white hover:bg-ink"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
    </button>
  );
}

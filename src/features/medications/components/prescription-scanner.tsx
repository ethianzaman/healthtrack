"use client";

import { Camera, ImageUp, Keyboard, ScanText, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { StatusMessage, type FormStatus } from "@/components/ui/feedback";
import { parsePrescriptionText, type PrescriptionDraft } from "@/domain/prescription";
import { prepareUpload } from "@/lib/image-compress";
import { cn } from "@/lib/utils";
import { readPrescriptionImage } from "../ocr";
import { MedicinesForm, type CurrentMedicine } from "./medicines-form";

type Reader = "ai" | "device";
type State =
  | { phase: "idle" }
  | { phase: "reading"; reader: Reader; progress: number; label: string }
  | { phase: "failed" }
  | { phase: "review"; draft: PrescriptionDraft; reader: Reader | "manual"; text: string };

const EMPTY_DRAFT: PrescriptionDraft = { doctorName: "", issuedOn: "", condition: "", medications: [] };

/** Sends the photo to our server, which asks Gemini; returns the draft or a message for the user. */
async function readWithAi(file: File): Promise<{ draft?: PrescriptionDraft; error?: string }> {
  const body = new FormData();
  body.append("image", await prepareUpload(file), "prescription.jpg");
  try {
    const res = await fetch("/api/prescriptions/read", { method: "POST", body });
    const data = (await res.json().catch(() => ({}))) as { draft?: PrescriptionDraft; error?: string };
    return res.ok && data.draft ? { draft: data.draft } : { error: data.error ?? "The AI reader is not available right now." };
  } catch {
    return { error: "No connection to the AI reader." };
  }
}

/**
 * Photo -> AI reading (Gemini, when set up) or on-device reading -> editable draft -> save.
 * Whatever reads it, every line lands in the form for the person to check; typing it in by hand
 * is always available.
 */
export function PrescriptionScanner({ current, conditions, aiReading = false }: { current: CurrentMedicine[]; conditions?: string[]; aiReading?: boolean }) {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [reader, setReader] = useState<Reader>(aiReading ? "ai" : "device");
  const [status, setStatus] = useState<FormStatus>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scan, setScan] = useState(0);
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  function showDraft(draft: PrescriptionDraft, by: Reader | "manual", text = "") {
    setScan((n) => n + 1);
    setState({ phase: "review", draft, reader: by, text });
    if (by !== "manual" && !draft.medications.length) {
      setStatus({ type: "error", message: "No medicines recognised. Type them in below, or try a sharper, well-lit photo." });
    }
  }

  async function read(photo: File, using: Reader) {
    setStatus(null);
    if (using === "ai") {
      setState({ phase: "reading", reader: "ai", progress: 0, label: "Reading with AI" });
      const { draft, error } = await readWithAi(photo);
      if (draft) return showDraft(draft, "ai");
      setState({ phase: "failed" });
      setStatus({ type: "error", message: `${error} You can read it on this device instead, or type the medicines in.` });
      return;
    }
    setState({ phase: "reading", reader: "device", progress: 0, label: "Preparing photo" });
    try {
      const text = await readPrescriptionImage(photo, (progress, label) => setState({ phase: "reading", reader: "device", progress, label }));
      showDraft(parsePrescriptionText(text), "device", text);
    } catch {
      setState({ phase: "failed" });
      setStatus({ type: "error", message: "Could not read this photo on the device. Check your connection (the reader downloads once), or type the medicines in." });
    }
  }

  function handleFile(picked: File | undefined) {
    if (!picked) return;
    if (!picked.type.startsWith("image/")) {
      setStatus({ type: "error", message: "Please choose a photo (JPG or PNG)." });
      return;
    }
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    void read(picked, reader);
  }

  function reset(message?: FormStatus) {
    setState({ phase: "idle" });
    setFile(null);
    setPreview(null);
    setStatus(message ?? null);
    if (cameraRef.current) cameraRef.current.value = "";
    if (uploadRef.current) uploadRef.current.value = "";
  }

  return (
    <div className="@container space-y-4">
      {state.phase === "idle" ? (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <label className={buttonClasses({ variant: "primary", className: "cursor-pointer" })}>
              <Camera className="h-4 w-4" /> Take a photo
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
            <label className={buttonClasses({ variant: "secondary", className: "cursor-pointer" })}>
              <ImageUp className="h-4 w-4" /> Upload an image
              <input ref={uploadRef} type="file" accept="image/*" className="sr-only" onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
          </div>

          {aiReading ? (
            <fieldset className="space-y-2">
              <legend className="sr-only">How to read the photo</legend>
              <ReaderOption
                checked={reader === "ai"}
                onSelect={() => setReader("ai")}
                icon={<Sparkles className="h-4 w-4 text-accent" />}
                title="Read with AI (recommended)"
                text="Most accurate, also for handwriting and Bangla. The photo is sent to Google Gemini to read; HealthTrack doesn't keep it."
              />
              <ReaderOption
                checked={reader === "device"}
                onSelect={() => setReader("device")}
                icon={<ScanText className="h-4 w-4 text-ink-3" />}
                title="Read on this device"
                text="Nothing leaves your phone. Works best with clearly printed prescriptions."
              />
            </fieldset>
          ) : (
            <p className="text-[13px] text-ink-3">Lay the prescription flat in good light. The photo is read on this device and is never uploaded. Printed prescriptions work best.</p>
          )}
          <button type="button" onClick={() => showDraft(EMPTY_DRAFT, "manual")} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline">
            <Keyboard className="h-3.5 w-3.5" /> Or type the prescription in yourself
          </button>
        </>
      ) : null}

      {state.phase === "reading" ? (
        <div role="status" aria-live="polite" className="space-y-2">
          <div className="flex items-center justify-between text-[13px] text-ink-2">
            <span>{state.label}...</span>
            {state.reader === "device" ? <span className="font-mono tabular-nums">{Math.round(state.progress * 100)}%</span> : <span className="text-ink-3">usually 5–15 seconds</span>}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
            {state.reader === "device" ? (
              <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${Math.max(4, state.progress * 100)}%` }} />
            ) : (
              <div className="h-full w-1/3 animate-[scan_1.4s_ease-in-out_infinite] rounded-full bg-accent" />
            )}
          </div>
        </div>
      ) : null}

      <StatusMessage status={status} />

      {state.phase === "failed" ? (
        <div className="flex flex-wrap gap-2">
          {file ? (
            <Button type="button" variant="secondary" onClick={() => read(file, "device")}>
              <ScanText className="h-4 w-4" /> Read on this device instead
            </Button>
          ) : null}
          {file && aiReading ? (
            <Button type="button" variant="ghost" onClick={() => read(file, "ai")}>
              <Sparkles className="h-4 w-4" /> Try AI again
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={() => showDraft(EMPTY_DRAFT, "manual")}>
            <Keyboard className="h-4 w-4" /> Type it in
          </Button>
          <Button type="button" variant="ghost" onClick={() => reset()}>
            Start over
          </Button>
        </div>
      ) : null}

      {state.phase === "review" ? (
        <div className={cn("grid gap-5", preview && "@3xl:grid-cols-[minmax(0,220px)_1fr]")}>
          {preview ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL, nothing to optimise */}
              <img src={preview} alt="Your prescription" className="max-h-56 w-full rounded-lg border border-line object-contain @3xl:max-h-96" />
              {state.reader === "ai" ? (
                <p className="flex items-center gap-1.5 text-[12px] text-ink-3">
                  <Sparkles className="h-3.5 w-3.5" /> Read by AI. Check each line against the paper.
                </p>
              ) : state.reader === "device" ? (
                <details className="text-[13px]">
                  <summary className="cursor-pointer text-ink-2">Text we read</summary>
                  <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-md bg-sunken p-3 font-mono text-[12px] text-ink-2">{state.text || "(nothing)"}</pre>
                </details>
              ) : null}
            </div>
          ) : null}
          <MedicinesForm
            key={scan}
            draft={state.reader === "manual" ? undefined : state.draft}
            current={current}
            conditions={conditions}
            onCancel={() => reset()}
            onSaved={(added) => reset({ type: "success", message: `${added} ${added === 1 ? "medicine" : "medicines"} added from the prescription.` })}
          />
        </div>
      ) : null}
    </div>
  );
}

function ReaderOption({ checked, onSelect, icon, title, text }: { checked: boolean; onSelect: () => void; icon: ReactNode; title: string; text: string }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors", checked ? "border-accent bg-accent-soft/40" : "border-line hover:border-line-strong")}>
      <input type="radio" name="rx-reader" checked={checked} onChange={onSelect} className="mt-1 accent-[var(--color-accent)]" />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-[14px] font-medium text-ink">
          {icon}
          {title}
        </span>
        <span className="mt-0.5 block text-[12px] leading-snug text-ink-3">{text}</span>
      </span>
    </label>
  );
}

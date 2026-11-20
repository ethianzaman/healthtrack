"use client";

import { Camera, ImageUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { StatusMessage, type FormStatus } from "@/components/ui/feedback";
import { parsePrescriptionText, type PrescriptionDraft } from "@/domain/prescription";
import { readPrescriptionImage } from "../ocr";
import { PrescriptionReview } from "./prescription-review";

type State =
  | { phase: "idle" }
  | { phase: "reading"; progress: number; label: string }
  | { phase: "review"; draft: PrescriptionDraft; text: string };

/** Photo -> on-device OCR -> parsed draft -> user review -> save. */
export function PrescriptionScanner() {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [status, setStatus] = useState<FormStatus>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scan, setScan] = useState(0);
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus({ type: "error", message: "Please choose a photo (JPG or PNG)." });
      return;
    }
    setStatus(null);
    setPreview(URL.createObjectURL(file));
    setState({ phase: "reading", progress: 0, label: "Preparing photo" });
    try {
      const text = await readPrescriptionImage(file, (progress, label) => setState({ phase: "reading", progress, label }));
      const draft = parsePrescriptionText(text);
      setScan((n) => n + 1);
      setState({ phase: "review", draft, text });
      if (!draft.medications.length) {
        setStatus({ type: "error", message: "No medicines recognised. Type them in below, or try a sharper, well-lit photo." });
      }
    } catch {
      setState({ phase: "idle" });
      setStatus({ type: "error", message: "Could not read this photo. Check your connection (the reader downloads once) and try again." });
    }
  }

  function reset(message?: FormStatus) {
    setState({ phase: "idle" });
    setPreview(null);
    setStatus(message ?? null);
    if (cameraRef.current) cameraRef.current.value = "";
    if (uploadRef.current) uploadRef.current.value = "";
  }

  return (
    <div className="space-y-4">
      {state.phase === "idle" ? (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className={buttonClasses({ variant: "primary", className: "cursor-pointer" })}>
              <Camera className="h-4 w-4" /> Take a photo
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
            <label className={buttonClasses({ variant: "secondary", className: "cursor-pointer" })}>
              <ImageUp className="h-4 w-4" /> Upload an image
              <input ref={uploadRef} type="file" accept="image/*" className="sr-only" onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
          </div>
          <p className="text-[13px] text-ink-3">
            Lay the prescription flat in good light. The photo is read on this device and is never uploaded. Printed prescriptions work best.
          </p>
        </>
      ) : null}

      {state.phase === "reading" ? (
        <div role="status" aria-live="polite" className="space-y-2">
          <div className="flex items-center justify-between text-[13px] text-ink-2">
            <span>{state.label}...</span>
            <span className="font-mono tabular-nums">{Math.round(state.progress * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
            <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${Math.max(4, state.progress * 100)}%` }} />
          </div>
        </div>
      ) : null}

      <StatusMessage status={status} />

      {state.phase === "review" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,220px)_1fr]">
          <div className="space-y-3">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL, nothing to optimise
              <img src={preview} alt="Your prescription" className="max-h-72 w-full rounded-lg border border-line object-contain lg:max-h-96" />
            ) : null}
            <details className="text-[13px]">
              <summary className="cursor-pointer text-ink-2">Text we read</summary>
              <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-md bg-sunken p-3 font-mono text-[12px] text-ink-2">{state.text || "(nothing)"}</pre>
            </details>
          </div>
          <PrescriptionReview
            key={scan}
            draft={state.draft}
            onCancel={() => reset()}
            onSaved={(added) => reset({ type: "success", message: `${added} ${added === 1 ? "medicine" : "medicines"} added from the prescription.` })}
          />
        </div>
      ) : null}
    </div>
  );
}

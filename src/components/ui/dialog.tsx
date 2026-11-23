"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Modal built on the native <dialog>: focus is trapped, Escape closes, the page behind is inert.
 * Content renders only while open, so forms inside start fresh each time.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  wide,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Wider panel, e.g. for image viewing. */
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()} // click on the backdrop
      aria-label={title}
      className={cn(
        "m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-xl border border-line bg-surface p-0 text-ink shadow-[0_24px_80px_-20px_rgba(15,23,42,0.45)] backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]",
        wide ? "max-w-4xl" : "max-w-xl",
        className,
      )}
    >
      {open ? (
        <div>
          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line-soft bg-surface px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-ink">{title}</h2>
              {description ? <p className="text-[13px] text-ink-3">{description}</p> : null}
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-4 py-4 sm:px-5">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}

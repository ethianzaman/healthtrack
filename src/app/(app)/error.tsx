"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-md py-16">
      <h1 className="font-display text-[32px] leading-tight text-ink">That page didn&apos;t load.</h1>
      <p className="mt-2 text-sm text-ink-3">Your data is safe. Try again in a moment. {error.digest ? <span className="font-mono text-xs">ref {error.digest}</span> : null}</p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}

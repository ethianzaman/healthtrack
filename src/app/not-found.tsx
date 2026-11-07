import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col justify-between px-5 py-8 sm:px-12">
      <Logo />
      <div className="max-w-xl">
        <p className="font-mono text-sm text-accent">404</p>
        <h1 className="mt-3 font-display text-[48px] leading-none tracking-[-0.03em] text-ink">This page isn&apos;t in the logbook.</h1>
        <p className="mt-4 text-[15px] text-ink-2">The address may be wrong, or a shared link has expired or been revoked by its owner.</p>
        <Link href="/" className="mt-8 inline-block border-b border-ink pb-0.5 text-[15px] text-ink hover:border-accent hover:text-accent">
          Back to the start
        </Link>
      </div>
      <span />
    </div>
  );
}

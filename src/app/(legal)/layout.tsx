import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-3">
          <Logo />
          <nav className="flex gap-1 text-sm">
            <Link href="/terms" className="rounded-md px-3 py-2.5 text-ink-2 hover:bg-sunken hover:text-ink">Terms</Link>
            <Link href="/privacy" className="rounded-md px-3 py-2.5 text-ink-2 hover:bg-sunken hover:text-ink">Privacy</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <article className="space-y-4 text-[15px] leading-relaxed text-ink-2 [&_h1]:mb-2 [&_h1]:text-[34px] [&_h1]:leading-tight [&_h1]:text-ink [&_h2]:mt-9 [&_h2]:text-[20px] [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:text-ink">
          {children}
        </article>
      </main>
    </div>
  );
}

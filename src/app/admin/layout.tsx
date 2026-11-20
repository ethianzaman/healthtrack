import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { requireAdmin } from "@/server/auth/admin";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo href="/admin" />
            <span className="rounded bg-ink px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-paper">Admin</span>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/admin" className="rounded-md px-3 py-2.5 text-ink-2 hover:bg-sunken hover:text-ink">Overview</Link>
            <Link href="/admin/users" className="rounded-md px-3 py-2.5 text-ink-2 hover:bg-sunken hover:text-ink">Users</Link>
            <Link href="/dashboard" className="rounded-md px-3 py-2.5 text-ink-3 hover:bg-sunken hover:text-ink">Back to app</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
        <p className="mt-10 text-[12px] text-ink-3">
          Signed in as {admin.email}. This panel shows account activity only - health readings, medicines and notes are never visible here.
        </p>
      </main>
    </div>
  );
}

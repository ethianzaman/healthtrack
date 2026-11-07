import Link from "next/link";
import { Logo, LogoMark } from "@/components/layout/logo";
import { BottomNav, NavLinks } from "@/components/layout/nav-links";
import { planLimits } from "@/config/plans";
import { logoutAction } from "@/features/auth/actions";
import { ProfileSwitcher } from "@/features/profiles/components/profile-switcher";
import { requireAppContext } from "@/server/auth/context";
import { profileService } from "@/server/services/profile.service";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireAppContext();
  const profiles = await profileService.list(user.id);

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar (lg+) */}
      <div className="hidden w-60 shrink-0 bg-ink lg:block xl:w-64">
        <aside className="sticky top-0 flex h-dvh flex-col px-5 py-6 text-paper">
          <Logo href="/dashboard" tone="paper" />
          <p className="eyebrow mb-3 mt-10 text-paper/40!">Logbook</p>
          <NavLinks />
          <div className="mt-auto border-t border-paper/10 pt-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper/10 font-mono text-xs text-paper">{initials(user.name)}</span>
              <div className="min-w-0 text-sm">
                <p className="truncate text-paper">{user.name}</p>
                <p className="font-mono text-[11px] uppercase tracking-wider text-accent">{planLimits(user.plan).label} plan</p>
              </div>
            </div>
            <form action={logoutAction} className="mt-3">
              <button type="submit" className="py-1 text-[13px] text-paper/50 underline-offset-4 hover:text-paper hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
            {/* Mark only on phones, full wordmark on tablets; the sidebar carries it on desktop */}
            <Link href="/dashboard" className="flex h-11 shrink-0 items-center text-ink sm:hidden" aria-label="Overview">
              <LogoMark />
            </Link>
            <div className="hidden sm:block lg:hidden">
              <Logo href="/dashboard" />
            </div>
            <div className="ml-auto min-w-0">
              <ProfileSwitcher profiles={profiles.map(({ id, name, relation }) => ({ id, name, relation }))} activeId={profile.id} />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] pt-6 sm:px-6 sm:pt-8 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

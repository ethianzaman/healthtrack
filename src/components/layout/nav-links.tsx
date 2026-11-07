"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Droplet, FileText, HeartPulse, LayoutGrid, MoreHorizontal, X, type LucideIcon } from "lucide-react";
import { logoutAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  short: string;
  icon?: LucideIcon;
  /** Shown as a tab in the mobile bottom bar; others go under "More". */
  primary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", short: "Overview", icon: LayoutGrid, primary: true },
  { href: "/blood-pressure", label: "Blood pressure", short: "Pressure", icon: HeartPulse, primary: true },
  { href: "/glucose", label: "Glucose", short: "Glucose", icon: Droplet, primary: true },
  { href: "/medications", label: "Medications", short: "Medicines" },
  { href: "/reports", label: "Reports", short: "Reports", icon: FileText, primary: true },
  { href: "/sharing", label: "Doctor access", short: "Doctor" },
  { href: "/settings", label: "Settings", short: "Settings" },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop sidebar: numbered index navigation (like a logbook's table of contents). */
export function NavLinks() {
  const isActive = useIsActive();
  return (
    <nav aria-label="Main" className="flex flex-col">
      {NAV_ITEMS.map(({ href, label }, i) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-baseline gap-3 border-l-2 py-2 pl-4 text-[15px] transition-colors",
              active ? "border-accent text-paper" : "border-transparent text-paper/55 hover:text-paper",
            )}
          >
            <span className={cn("font-mono text-[11px] tabular-nums", active ? "text-accent" : "text-paper/35")}>{String(i + 1).padStart(2, "0")}</span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Phone & tablet: app-style bottom tab bar with the four daily destinations,
 * plus a "More" sheet for the rest and sign out. Respects the iOS home indicator.
 */
export function BottomNav() {
  const isActive = useIsActive();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const secondary = NAV_ITEMS.filter((i) => !i.primary);
  const moreActive = secondary.some((i) => isActive(i.href));

  // Close the sheet whenever the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const tab = "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] transition-colors";

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-30 bg-ink/40 backdrop-blur-[2px] lg:hidden" onClick={() => setOpen(false)} aria-hidden />
      ) : null}

      <div
        id="more-sheet"
        role="dialog"
        aria-label="More"
        hidden={!open}
        className="fixed inset-x-0 bottom-0 z-40 rounded-t-xl border-t border-line bg-surface px-5 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-4 lg:hidden"
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="eyebrow">More</p>
          <button type="button" onClick={() => setOpen(false)} className="-mr-2 flex h-10 w-10 items-center justify-center text-ink-3" aria-label="Close">
            <X className="h-5 w-5" strokeWidth={1.6} />
          </button>
        </div>
        <ul className="divide-y divide-line-soft">
          {secondary.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={cn("flex min-h-12 items-center font-display text-[20px]", isActive(item.href) ? "text-accent" : "text-ink")}>
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <form action={logoutAction}>
              <button type="submit" className="flex min-h-12 w-full items-center text-[15px] text-ink-3">
                Sign out
              </button>
            </form>
          </li>
        </ul>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-50 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        {NAV_ITEMS.filter((i) => i.primary).map(({ href, short, icon: Icon }) => {
          const active = isActive(href) && !open;
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn(tab, active ? "text-ink" : "text-ink-3")}>
              {Icon ? <Icon className={cn("h-[22px] w-[22px]", active && "text-accent")} strokeWidth={1.6} aria-hidden /> : null}
              {short}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="more-sheet"
          className={cn(tab, open || moreActive ? "text-ink" : "text-ink-3")}
        >
          <MoreHorizontal className={cn("h-[22px] w-[22px]", (open || moreActive) && "text-accent")} strokeWidth={1.6} aria-hidden />
          More
        </button>
      </nav>
    </>
  );
}

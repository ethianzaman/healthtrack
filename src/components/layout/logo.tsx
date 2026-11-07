import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/** Custom mark: a pulse trace running through a drop - blood pressure meets glucose. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-7 w-7", className)} aria-hidden>
      <path d="M16 3c5.5 7 9 12 9 16.2A9 9 0 0 1 7 19.2C7 15 10.5 10 16 3Z" fill="var(--color-accent)" />
      <path d="M3 20h7l2.2-4.5 3.3 8 3-11 2.5 7.5H29" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/", tone = "ink" }: { href?: string; tone?: "ink" | "paper" }) {
  return (
    <Link href={href} className={cn("flex min-h-11 items-center gap-2", tone === "paper" ? "text-paper" : "text-ink")}>
      <LogoMark />
      <span className="font-display text-[22px] leading-none tracking-[-0.02em]">{siteConfig.name}</span>
    </Link>
  );
}

import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { buttonClasses } from "@/components/ui/button";
import { PLANS } from "@/config/plans";
import { siteConfig } from "@/config/site";
import { getCurrentUser } from "@/server/auth/context";

const CHAPTERS = [
  {
    title: "Two readings a day, nothing more",
    text: "Morning and evening pressure, fasting and after-meal sugar. The form knows what time it is, so logging takes about ten seconds.",
  },
  {
    title: "A report your doctor reads in a minute",
    text: "Page one has everything that matters: morning against evening, before against after meals, time in range and current medicines. The raw readings go in the back.",
  },
  {
    title: "Your parents' numbers, from your phone",
    text: "Keep separate logbooks for your father, mother or anyone you look after, each with the targets their own doctor set.",
  },
  {
    title: "Send a link, not a screenshot",
    text: "A private, read-only link that expires on its own. The doctor opens it in a browser. You can revoke it whenever you like.",
  },
];

/** Static sample of what a week looks like in the app. */
const SAMPLE = [
  { day: "Mon", am: "128/82", pm: "121/78", fbs: "104", pp: "152" },
  { day: "Tue", am: "134/86", pm: "124/79", fbs: "111", pp: "168" },
  { day: "Wed", am: "131/84", pm: "119/76", fbs: "98", pp: "187", flag: true },
  { day: "Thu", am: "126/81", pm: "122/77", fbs: "102", pp: "149" },
  { day: "Fri", am: "129/83", pm: "118/75", fbs: "107", pp: "158" },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  const cta = user ? { href: "/dashboard", label: "Open your logbook" } : { href: "/register", label: "Start a logbook, free" };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:py-6">
        <Logo />
        <nav className="flex items-center gap-4 text-sm sm:gap-6">
          <a href="#how" className="hidden text-ink-2 hover:text-ink sm:inline">
            How it works
          </a>
          <a href="#pricing" className="hidden text-ink-2 hover:text-ink sm:inline">
            Pricing
          </a>
          {!user ? (
            <Link href="/login" className="py-3 text-ink-2 hover:text-ink">
              Sign in
            </Link>
          ) : null}
          <Link href={cta.href} className={buttonClasses({ size: "sm" })}>
            {user ? "Dashboard" : "Get started"}
          </Link>
        </nav>
      </header>

      {/* Hero: copy left, a real-looking log sheet right */}
      <section className="mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-6 sm:pt-10 lg:grid-cols-[1.15fr_1fr] lg:items-end lg:gap-14 lg:pb-20 lg:pt-20">
        <div>
          <p className="eyebrow mb-6">Blood pressure · Blood sugar · Since your last visit</p>
          <h1 className="font-display text-[clamp(2.4rem,9vw,4.25rem)] leading-[0.98] tracking-[-0.035em]">
            Bring your doctor
            <br />
            the <em className="text-accent">whole month</em>,
            <br />
            not just today.
          </h1>
          <p className="mt-7 max-w-md text-[17px] leading-relaxed text-ink-2">
            One reading at the clinic says very little. {siteConfig.name} keeps your morning and evening numbers in one tidy logbook and turns them into a one-page report.
          </p>
          <div className="mt-8 flex flex-col items-start gap-4 sm:mt-9 sm:flex-row sm:items-center sm:gap-5">
            <Link href={cta.href} className={buttonClasses({ size: "lg", variant: "accent" })}>
              {cta.label}
            </Link>
            <span className="text-sm text-ink-3">No card needed. PDF reports on the free plan.</span>
          </div>
        </div>

        <figure className="relative">
          <div className="rounded-lg border border-line bg-surface p-4 sm:rotate-[0.6deg] sm:p-5 shadow-[0_1px_0_#e2e8f0,0_18px_40px_-24px_rgba(15,23,42,0.18)]">
            <div className="flex items-baseline justify-between border-b border-ink pb-2">
              <p className="font-display text-lg ">Week 44</p>
              <p className="eyebrow">Amena B. · 71 y</p>
            </div>
            <table className="mt-1 w-full font-mono text-[11.5px] tabular-nums sm:text-[13px]">
              <thead>
                <tr className="text-left">
                  <th className="eyebrow py-2 font-normal" />
                  <th className="eyebrow py-2 text-right font-normal">BP am</th>
                  <th className="eyebrow py-2 text-right font-normal">BP pm</th>
                  <th className="eyebrow py-2 text-right font-normal">Fasting</th>
                  <th className="eyebrow py-2 text-right font-normal">After meal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-line">
                {SAMPLE.map((r) => (
                  <tr key={r.day}>
                    <td className="py-2 font-sans text-ink-3">{r.day}</td>
                    <td className="py-2 text-right">{r.am}</td>
                    <td className="py-2 text-right">{r.pm}</td>
                    <td className="py-2 text-right">{r.fbs}</td>
                    <td className={`py-2 text-right ${r.flag ? "font-semibold text-accent" : ""}`}>
                      {r.pp}
                      {r.flag ? <sup className="ml-0.5">*</sup> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 border-t border-line pt-3 font-display text-[14px] leading-snug text-ink-2">
              * Mornings run about 8 mmHg higher than evenings. Wednesday&apos;s lunch pushed sugar above target.
            </p>
          </div>
          <figcaption className="eyebrow mt-4 text-right">Sample week, as it appears in the app</figcaption>
        </figure>
      </section>

      {/* How it works: numbered chapters, not icon cards */}
      <section id="how" className="border-t border-ink">
        <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
          <h2 className="max-w-lg font-display text-[34px] leading-tight tracking-[-0.02em]">Built around how check-ups actually go.</h2>
          <ol className="mt-12 grid gap-x-16 sm:grid-cols-2">
            {CHAPTERS.map((c, i) => (
              <li key={c.title} className="grid grid-cols-[36px_1fr] border-t border-line py-6 sm:grid-cols-[44px_1fr] sm:py-7">
                <span className="font-mono text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-[18px] font-medium tracking-[-0.01em]">{c.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{c.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing as a plain comparison, not floating cards */}
      <section id="pricing" className="bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:py-20 lg:grid-cols-[1fr_1.4fr] lg:gap-12">
          <div>
            <h2 className="font-display text-[34px] leading-tight tracking-[-0.02em]">
              Free for one person.
              <br />
              <em className="text-accent">Pro</em> for the whole family.
            </h2>
            <p className="mt-4 max-w-sm text-paper/60">Readings are unlimited on both plans. Pro adds more profiles, more doctor links and Word export.</p>
          </div>
          <table className="w-full text-[14px] sm:text-[15px]">
            <thead>
              <tr className="border-b border-paper/20 text-left">
                <th className="py-3 font-normal" />
                {Object.values(PLANS).map((p) => (
                  <th key={p.label} className="py-3 text-right font-normal">
                    <span className="block font-display text-xl ">{p.label}</span>
                    <span className="font-mono text-sm text-paper/60">${p.priceMonthlyUsd}/mo</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-paper/10">
              {[
                ["Patient profiles", (p: (typeof PLANS)["FREE"]) => String(p.maxProfiles)],
                ["Active doctor links", (p: (typeof PLANS)["FREE"]) => String(p.maxActiveShareLinks)],
                ["Report formats", (p: (typeof PLANS)["FREE"]) => p.reportFormats.map((f) => f.toUpperCase()).join(" · ")],
                ["Readings", () => "Unlimited"],
              ].map(([label, fn]) => (
                <tr key={label as string}>
                  <td className="py-3 text-paper/70">{label as string}</td>
                  {Object.values(PLANS).map((p) => (
                    <td key={p.label} className="py-3 text-right font-mono text-sm">
                      {(fn as (p: (typeof PLANS)["FREE"]) => string)(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-6 px-5 py-10 text-[13px] text-ink-3">
        <Logo />
        <p className="max-w-md">{siteConfig.disclaimer}</p>
      </footer>
    </div>
  );
}

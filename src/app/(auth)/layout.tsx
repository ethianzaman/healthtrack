import { redirect } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { getCurrentUser } from "@/server/auth/context";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      {/* Left: dark panel with a handwritten-log feel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-paper lg:flex">
        <Logo tone="paper" />
        <blockquote className="max-w-md">
          <p className="font-display text-[30px] leading-[1.15] tracking-[-0.02em]">
            &ldquo;Your readings have been <em className="text-accent">much steadier</em> in the evenings since we moved the tablet. Let&apos;s keep it there.&rdquo;
          </p>
          <footer className="eyebrow mt-6 text-paper/50!">The kind of conversation a logbook makes possible</footer>
        </blockquote>
        <div className="font-mono text-[12px] leading-6 text-paper/35">
          <p>07:12 · 132/84 · 71 bpm · fasting 108</p>
          <p>13:40 · after lunch 164</p>
          <p>20:05 · 121/78 · 68 bpm</p>
        </div>
      </aside>

      <main className="flex min-h-dvh flex-col justify-center px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-[calc(env(safe-area-inset-top)+2rem)] sm:px-12">
        <div className="mb-10 lg:hidden">
          <Logo />
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}

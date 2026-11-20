import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { DELETION_GRACE_DAYS, WARNING_RESPONSE_DAYS } from "@/domain/account-policy";
import { supportEmail } from "@/server/mail/mailer";

export const metadata: Metadata = { title: "Terms of Service" };

const UPDATED = "20 November 2026";

export default function TermsPage() {
  const contact = supportEmail();
  return (
    <>
      <p className="eyebrow">Last updated {UPDATED}</p>
      <h1>Terms of Service</h1>
      <p>
        These terms cover your use of {siteConfig.name}. By creating an account you agree to them. Please also read our{" "}
        <Link href="/privacy" className="text-accent underline underline-offset-2">Privacy Policy</Link>.
      </p>

      <h2>1. Not medical advice</h2>
      <p>
        {siteConfig.name} is a logbook for readings you take yourself. Classifications, colours, averages and insights are general information,
        not a diagnosis or treatment advice. Always follow your doctor. In an emergency, contact emergency services.
      </p>
      <p>Medicines filled in from a photographed prescription are a best-effort reading. You must check every line against the paper before saving.</p>

      <h2>2. Your account</h2>
      <ul>
        <li>You need a valid email address. We send a one-time code to confirm it when you sign up.</li>
        <li>Keep your password private. You are responsible for activity on your account.</li>
        <li>You may keep logbooks for family members you care for, with their permission.</li>
        <li>You can download your data at any time (Reports: PDF, Word or CSV).</li>
      </ul>

      <h2>3. Acceptable use</h2>
      <p>Don&apos;t use the service to break the law, harm others, send spam, create accounts in bulk, abuse doctor links, or try to access other people&apos;s data or disrupt the service.</p>

      <h2>4. Warnings, suspension and deletion</h2>
      <p>If we believe an account breaks these terms, this is what happens:</p>
      <ul>
        <li><strong>Warning:</strong> we email you the reason. You have <strong>{WARNING_RESPONSE_DAYS} days</strong> to reply (from inside the app or by email).</li>
        <li><strong>No reply:</strong> the account is suspended. You can&apos;t sign in and your doctor links stop working. We email you the deletion date together with a copy of your readings (CSV).</li>
        <li><strong>Deletion:</strong> <strong>{DELETION_GRACE_DAYS} days</strong> after suspension the account and all its data are permanently deleted. This can&apos;t be undone.</li>
        <li>In serious cases (for example abuse or a legal requirement) we may suspend straight away; you still receive the {DELETION_GRACE_DAYS}-day notice and your data before anything is deleted.</li>
        <li>If you reply, a person reviews it. A suspension can be lifted at any time before deletion.</li>
      </ul>

      <h2>5. Plans</h2>
      <p>The free plan may have limits (for example the number of profiles or doctor links). Paid features, if offered, are described on the pricing section of our home page.</p>

      <h2>6. Availability and liability</h2>
      <p>
        We work to keep the service available and your data safe, but it is provided &ldquo;as is&rdquo;. To the extent the law allows, we are not
        liable for indirect losses or for decisions made from data in the app.
      </p>

      <h2>7. Changes</h2>
      <p>If these terms change in an important way we will tell you by email or in the app before the change applies.</p>

      <h2>8. Contact</h2>
      <p>{contact ? <>Questions: <a className="text-accent underline underline-offset-2" href={`mailto:${contact}`}>{contact}</a></> : "Questions: reply to any email from us."}</p>
    </>
  );
}

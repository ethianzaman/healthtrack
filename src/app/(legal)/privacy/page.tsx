import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { DELETION_GRACE_DAYS } from "@/domain/account-policy";
import { supportEmail } from "@/server/mail/mailer";
import { OTP_TTL_MINUTES } from "@/server/security/otp";

export const metadata: Metadata = { title: "Privacy Policy" };

const UPDATED = "20 November 2026";

export default function PrivacyPage() {
  const contact = supportEmail();
  return (
    <>
      <p className="eyebrow">Last updated {UPDATED}</p>
      <h1>Privacy Policy</h1>
      <p>Your readings are health data. This page explains plainly what we keep, why, and who can see it.</p>

      <h2>What we store</h2>
      <ul>
        <li><strong>Account:</strong> name, email, a securely hashed password (never the password itself), time zone and plan.</li>
        <li><strong>What you enter:</strong> blood pressure and glucose readings, notes, medicines, the conditions they treat, and family profiles.</li>
        <li><strong>Usage records:</strong> when you sign up, sign in (including failed attempts), download reports, create or use doctor links, and save a scanned prescription. We keep the date, the kind of action and your country - <strong>not your IP address</strong> and never the content of your readings.</li>
        <li><strong>Email codes:</strong> one-time codes expire after {OTP_TTL_MINUTES} minutes; only a scrambled (hashed) form is stored.</li>
      </ul>

      <h2>What we don&apos;t do</h2>
      <ul>
        <li>We don&apos;t sell your data or use it for advertising.</li>
        <li>Prescription photos are read <strong>on your own device</strong> and are never uploaded to us.</li>
        <li>Our admin panel shows account activity only (for example &ldquo;signed in&rdquo;, &ldquo;downloaded a PDF&rdquo;, number of readings). It does not show readings, medicines, conditions or notes.</li>
      </ul>

      <h2>Who can see your readings</h2>
      <ul>
        <li>You, while signed in.</li>
        <li>Anyone you give a doctor link to, until it expires or you revoke it.</li>
      </ul>

      <h2>Service providers</h2>
      <ul>
        <li><strong>Vercel</strong> hosts the app (servers in Mumbai, India).</li>
        <li><strong>Turso</strong> hosts the database (Mumbai, India).</li>
        <li><strong>Google (Gmail)</strong> delivers our emails: codes and account notices.</li>
      </ul>

      <h2>Emails we send</h2>
      <p>Sign-up and password codes, and notices about your account (warning, suspension, deletion). No marketing emails.</p>

      <h2>Keeping and deleting data</h2>
      <ul>
        <li>Your data is kept while your account exists. You can download it any time from Reports.</li>
        <li>
          If an account is suspended and scheduled for deletion, everything is permanently deleted {DELETION_GRACE_DAYS} days later. We first email a
          copy of the readings. Afterwards we keep only a scrambled form of the email, the reason and the date, so a repeat case can be recognised.
        </li>
        <li>To delete your account earlier, or to ask what we hold about you, contact us.</li>
      </ul>

      <h2>Security</h2>
      <p>Connections are encrypted (HTTPS), passwords are hashed, sign-in attempts are rate-limited, and doctor links are random, expiring and revocable.</p>

      <h2>Contact</h2>
      <p>
        {contact ? (
          <>
            Privacy questions or requests: <a className="text-accent underline underline-offset-2" href={`mailto:${contact}`}>{contact}</a>
          </>
        ) : (
          "Privacy questions or requests: reply to any email from us."
        )}
      </p>
      <p className="text-[13px] text-ink-3">{siteConfig.disclaimer}</p>
    </>
  );
}

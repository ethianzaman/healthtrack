import "server-only";
import { siteConfig } from "@/config/site";
import { OTP_TTL_MINUTES } from "@/server/security/otp";

/**
 * Plain, accessible emails: every message has a text version, HTML is a single
 * column with inline styles (what mail clients reliably render).
 */

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, bodyHtml: string, footer: string) {
  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px">
<tr><td style="padding:24px 28px 8px;font-size:18px;font-weight:bold;color:#0f766e">${escape(siteConfig.name)}</td></tr>
<tr><td style="padding:8px 28px 4px;font-size:20px;font-weight:bold">${escape(title)}</td></tr>
<tr><td style="padding:8px 28px 24px;font-size:15px;line-height:1.6;color:#334155">${bodyHtml}</td></tr>
</table>
<p style="max-width:520px;font-size:12px;color:#64748b;line-height:1.5;margin:16px auto 0">${footer}</p>
</td></tr></table></body></html>`;
}

const p = (text: string) => `<p style="margin:0 0 14px">${escape(text)}</p>`;
const codeBox = (code: string) =>
  `<p style="margin:8px 0 18px;font-family:'Courier New',monospace;font-size:32px;letter-spacing:8px;font-weight:bold;color:#0f172a">${escape(code)}</p>`;
const button = (href: string, label: string) =>
  `<p style="margin:6px 0 18px"><a href="${escape(href)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold">${escape(label)}</a></p>`;

const ignoreNote = "If you didn't ask for this, you can ignore this email.";

export function verifyEmailCode(name: string, code: string) {
  const subject = `${code} is your ${siteConfig.name} verification code`;
  const text = `Hi ${name},\n\nYour verification code is: ${code}\n\nIt expires in ${OTP_TTL_MINUTES} minutes. ${ignoreNote}`;
  const html = layout("Confirm your email", p(`Hi ${name}, enter this code to finish creating your account:`) + codeBox(code) + p(`It expires in ${OTP_TTL_MINUTES} minutes.`), ignoreNote);
  return { subject, text, html };
}

export function resetPasswordCode(name: string, code: string) {
  const subject = `${code} is your ${siteConfig.name} password reset code`;
  const text = `Hi ${name},\n\nYour password reset code is: ${code}\n\nIt expires in ${OTP_TTL_MINUTES} minutes. ${ignoreNote} Your password stays the same until you use the code.`;
  const html = layout(
    "Reset your password",
    p(`Hi ${name}, use this code to choose a new password:`) + codeBox(code) + p(`It expires in ${OTP_TTL_MINUTES} minutes.`),
    `${ignoreNote} Your password stays the same until you use the code.`,
  );
  return { subject, text, html };
}

export function accountWarning(o: { name: string; reason: string; deadline: string; appUrl: string; support: string }) {
  const subject = `Action needed on your ${siteConfig.name} account`;
  const reply = o.support ? `reply to this email (${o.support})` : "reply to this email";
  const text = `Hi ${o.name},\n\nWe've flagged your account for the following reason:\n\n${o.reason}\n\nPlease sign in and send us a response, or ${reply}, before ${o.deadline}.\nIf we don't hear from you by then, the account will be suspended and scheduled for deletion 30 days later.\n\nSign in: ${o.appUrl}/login\nYou can download a copy of your data any time from Reports > CSV.`;
  const html = layout(
    "Action needed on your account",
    p(`Hi ${o.name}, we've flagged your account for the following reason:`) +
      `<blockquote style="margin:0 0 14px;padding:10px 14px;border-left:3px solid #b45309;background:#fffbeb">${escape(o.reason)}</blockquote>` +
      p(`Please sign in and send us a response, or ${reply}, before ${o.deadline}.`) +
      button(`${o.appUrl}/login`, "Sign in and respond") +
      p("If we don't hear from you by then, the account will be suspended and scheduled for deletion 30 days later. You can download a copy of your data any time from Reports > CSV."),
    "You're receiving this because of a decision about your account. It isn't a marketing email.",
  );
  return { subject, text, html };
}

export function deletionNotice(o: { name: string; reason: string; deletionDate: string; support: string; hasAttachment: boolean }) {
  const subject = `Your ${siteConfig.name} account is suspended and will be deleted on ${o.deletionDate}`;
  const contact = o.support ? `Write to ${o.support}` : "Reply to this email";
  const attached = o.hasAttachment ? "A copy of your readings is attached as CSV files (they open in Excel or Google Sheets)." : "";
  const text = `Hi ${o.name},\n\nYour account has been suspended.\nReason: ${o.reason}\n\nThe account and all its data will be permanently deleted on ${o.deletionDate}.\n${attached}\n\n${contact} before that date if you think this is a mistake.`;
  const html = layout(
    "Your account is suspended",
    p(`Hi ${o.name}, your account has been suspended.`) +
      `<blockquote style="margin:0 0 14px;padding:10px 14px;border-left:3px solid #b91c1c;background:#fef2f2">${escape(o.reason)}</blockquote>` +
      p(`The account and all its data will be permanently deleted on ${o.deletionDate}.`) +
      (attached ? p(attached) : "") +
      p(`${contact} before that date if you think this is a mistake.`),
    "You're receiving this because of a decision about your account.",
  );
  return { subject, text, html };
}

export function accountDeleted(name: string) {
  const subject = `Your ${siteConfig.name} account has been deleted`;
  const text = `Hi ${name},\n\nAs announced, your account and all of its data have now been permanently deleted. This can't be undone.`;
  const html = layout("Account deleted", p(`Hi ${name}, as announced, your account and all of its data have now been permanently deleted. This can't be undone.`), "This is the last email you'll receive from us.");
  return { subject, text, html };
}

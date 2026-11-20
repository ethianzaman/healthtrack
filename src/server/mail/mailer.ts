import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getEnv } from "@/config/env";
import { siteConfig } from "@/config/site";
import { logger } from "@/server/logger";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: { filename: string; content: string | Buffer; contentType?: string }[];
}

type Mode = "smtp" | "console" | "disabled";

function mode(): Mode {
  const env = getEnv();
  if (env.MAIL_TRANSPORT === "console") return "console";
  return env.SMTP_USER && env.SMTP_PASS ? "smtp" : "disabled";
}

/** True when emails can actually be delivered (or printed, in console mode). Email verification depends on it. */
export function emailEnabled() {
  return mode() !== "disabled";
}

/** Reads process.env directly (no full validation) so static pages like /terms can build without secrets. */
export function supportEmail() {
  return process.env.SUPPORT_EMAIL || process.env.SMTP_USER || "";
}

let transporter: Transporter | undefined;

function smtp() {
  const env = getEnv();
  // Gmail SMTP over TLS. Free for ~500 emails/day; swap host/port for another provider later.
  transporter ??= nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } });
  return transporter;
}

export async function sendMail(message: MailMessage) {
  const m = mode();
  if (m === "disabled") {
    logger.warn("Email not configured (SMTP_USER/SMTP_PASS); message not sent", { subject: message.subject });
    return { sent: false as const };
  }
  if (m === "console") {
    const files = message.attachments?.map((a) => `${a.filename} (${String(a.content).length} bytes)`).join(", ") || "none";
    console.log(`\n[mail:console] to=${message.to} subject=${message.subject}\n${message.text}\nattachments: ${files}\n[/mail:console]\n`);
    return { sent: true as const };
  }
  await smtp().sendMail({ from: { name: siteConfig.name, address: getEnv().SMTP_USER! }, ...message });
  return { sent: true as const };
}

import { Resend } from "resend";
import nodemailer from "nodemailer";

// Delivery layer (STEP 7). Resend primary, SMTP fallback. Callers are
// responsible for suppression checks, rate limits, and tracking injection —
// this module only transports a finished message.

export interface OutgoingEmail {
  to: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export interface SendResult {
  channel: "RESEND" | "SMTP";
  providerMessageId: string;
}

// Optional per-user credentials (entered in Settings). When absent we fall back
// to the system/env credentials.
export interface SendCreds {
  resendApiKey?: string;
  smtp?: { host: string; port?: number; user?: string; pass?: string };
}

async function sendViaResend(email: OutgoingEmail, creds?: SendCreds): Promise<SendResult> {
  const apiKey = creds?.resendApiKey || process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from: `${email.fromName} <${email.fromEmail}>`,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    replyTo: email.replyTo,
    headers: email.headers,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
  return { channel: "RESEND", providerMessageId: data!.id };
}

async function sendViaSmtp(email: OutgoingEmail, creds?: SendCreds): Promise<SendResult> {
  const host = creds?.smtp?.host || process.env.SMTP_HOST;
  const port = creds?.smtp?.port || Number(process.env.SMTP_PORT || 587);
  const user = creds?.smtp?.user || process.env.SMTP_USER;
  const pass = creds?.smtp?.pass || process.env.SMTP_PASSWORD;
  if (!host) throw new Error("SMTP not configured");

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user ? { user, pass } : undefined,
  });

  const info = await transport.sendMail({
    from: `${email.fromName} <${email.fromEmail}>`,
    to: email.to,
    replyTo: email.replyTo,
    subject: email.subject,
    text: email.text,
    html: email.html,
    headers: email.headers,
  });
  return { channel: "SMTP", providerMessageId: info.messageId };
}

/** Send with Resend, falling back to SMTP on failure. */
export async function sendEmail(
  email: OutgoingEmail,
  preferred: "RESEND" | "SMTP" = "RESEND",
  creds?: SendCreds,
): Promise<SendResult> {
  const order =
    preferred === "RESEND"
      ? [sendViaResend, sendViaSmtp]
      : [sendViaSmtp, sendViaResend];

  let lastError: unknown;
  for (const fn of order) {
    try {
      return await fn(email, creds);
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`All channels failed: ${String(lastError)}`);
}

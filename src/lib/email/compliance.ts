import { createHmac } from "node:crypto";
import { config } from "@/lib/config";

// CAN-SPAM / GDPR compliance helpers. Every outbound email MUST include a
// physical mailing address and a working one-click unsubscribe. Tracking is
// opt-out-able per campaign; pixels/links are signed so they can't be forged.

function sign(value: string): string {
  return createHmac("sha256", config.trackingSecret).update(value).digest("hex").slice(0, 24);
}

export function signedToken(emailId: string): string {
  return `${emailId}.${sign(emailId)}`;
}

export function verifyToken(token: string): string | null {
  const [emailId, sig] = token.split(".");
  if (!emailId || !sig) return null;
  return sign(emailId) === sig ? emailId : null;
}

const appUrl = () => config.appUrl || "http://localhost:3000";

export function trackingPixelUrl(emailId: string): string {
  return `${appUrl()}/api/track/open/${signedToken(emailId)}.png`;
}

export function trackedLink(emailId: string, target: string): string {
  const t = signedToken(emailId);
  return `${appUrl()}/api/track/click/${t}?u=${encodeURIComponent(target)}`;
}

export function unsubscribeUrl(emailId: string): string {
  return `${appUrl()}/api/unsubscribe/${signedToken(emailId)}`;
}

/** Headers that improve deliverability + enable email-client one-click unsub. */
export function complianceHeaders(emailId: string): Record<string, string> {
  const url = unsubscribeUrl(emailId);
  return {
    "List-Unsubscribe": `<${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/** Append required footer + tracking pixel to an HTML body. */
export function decorateHtml(opts: {
  emailId: string;
  html: string;
  fromName: string;
  mailingAddress: string;
  track: boolean;
}): string {
  const footer = `
  <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0" />
  <p style="font-size:12px;color:#71717a;line-height:1.5">
    You received this because it may be relevant to your business. Not interested?
    <a href="${unsubscribeUrl(opts.emailId)}">Unsubscribe</a>.<br/>
    ${opts.fromName} · ${opts.mailingAddress}
  </p>`;
  const pixel = opts.track
    ? `<img src="${trackingPixelUrl(opts.emailId)}" width="1" height="1" alt="" style="display:none" />`
    : "";
  return `${opts.html}${footer}${pixel}`;
}

export function decorateText(opts: {
  emailId: string;
  text: string;
  fromName: string;
  mailingAddress: string;
}): string {
  return `${opts.text}\n\n--\n${opts.fromName} · ${opts.mailingAddress}\nUnsubscribe: ${unsubscribeUrl(opts.emailId)}`;
}

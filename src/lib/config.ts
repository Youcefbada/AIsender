// Central app config / boot secrets.
//
// These values MUST exist before the app can run (DB connection, JWT signing,
// the key used to encrypt the API keys users enter in Settings), so they live in
// code rather than in Settings. Environment variables, if set, override them —
// recommended for production. KEEP THIS REPO PRIVATE: it contains secrets.
//
// Everything else (Gemini/Groq/OpenRouter/Resend/Serper keys, sender email) is
// entered per-user in Settings → API keys, not here.

export const config = {
  // JWT signing secret for NextAuth.
  authSecret: process.env.AUTH_SECRET || "2wYyF8tIuIXAueopMSQBbdL0geFcS2LFmJTY1lAoi8o=",

  // AES-256-GCM key (base64, 32 bytes) for encrypting stored API keys.
  encryptionKey: process.env.ENCRYPTION_KEY || "2lekR7mcXnoYv/7pfN7R+p3KWtrEnxQUdAn+h83Qt+g=",

  // HMAC secret for signing tracking / unsubscribe links.
  trackingSecret: process.env.TRACKING_SECRET || "el6IXMWOX9YDka6GA3ATDayAdT7ANgi6",

  // Bearer token the cron scheduler must present to /api/agent/*.
  cronSecret: process.env.CRON_SECRET || "1ezlN3rKEZyjHPipG0OyQj1xC35+aHOi",

  // Public base URL used to build absolute tracking/unsubscribe links in emails.
  // Domain is optional for now — set this to your Hostinger URL when you have one
  // (e.g. "https://marlinrch.shop") so open-tracking and unsubscribe links work.
  appUrl: process.env.APP_URL || "",

  // Default sender (also configurable per user via Settings → Sender identity).
  emailFrom: process.env.EMAIL_FROM || "affiliate@luminax.pro",
  emailFromName: process.env.EMAIL_FROM_NAME || "Affiliate",
  emailMailingAddress: process.env.EMAIL_MAILING_ADDRESS || "",
};

// Central app config / boot secrets.
//
// These values MUST exist before the app can run (DB connection, JWT signing,
// the key used to encrypt the API keys users enter in Settings), so they live in
// code rather than in Settings. Environment variables, if set, override them —
// recommended for production. KEEP THIS REPO PRIVATE: it contains secrets.
//
// Everything else (Gemini/Groq/OpenRouter/Resend/Serper keys, sender email) is
// entered per-user in Settings → API keys, not here.

function requiredSecret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return devFallback;
}

export const config = {
  // JWT signing secret for NextAuth.
  authSecret: requiredSecret("AUTH_SECRET", "dev-auth-secret-change-in-production"),

  // AES-256-GCM key (base64, 32 bytes) for encrypting stored API keys.
  encryptionKey: requiredSecret("ENCRYPTION_KEY", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="),

  // HMAC secret for signing tracking / unsubscribe links.
  trackingSecret: process.env.TRACKING_SECRET || "dev-tracking-secret-change-in-production",

  // Bearer token the cron scheduler must present to /api/agent/*.
  cronSecret: requiredSecret("CRON_SECRET", "dev-cron-secret-change-in-production"),

  // Public base URL used for tracking/unsubscribe links in emails and auth redirects.
  appUrl: process.env.APP_URL || "http://localhost:3000",

  // Default sender (also configurable per user via Settings → Sender identity).
  emailFrom: process.env.EMAIL_FROM || "notifications@example.com",
  emailFromName: process.env.EMAIL_FROM_NAME || "Demand Scout",
  emailMailingAddress: process.env.EMAIL_MAILING_ADDRESS || "",
};

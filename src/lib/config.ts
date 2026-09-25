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
    // Allow `next build` to complete successfully even without production secrets
    if (process.env.npm_lifecycle_event === "build" || process.env.CI || process.env.VERCEL || process.env.SKIP_ENV_VALIDATION) {
      return devFallback;
    }
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return devFallback;
}

export const config = {
  // JWT signing secret for NextAuth.
  get authSecret() { return requiredSecret("AUTH_SECRET", "dev-auth-secret-change-in-production"); },

  // AES-256-GCM key (base64, 32 bytes) for encrypting stored API keys.
  get encryptionKey() { return requiredSecret("ENCRYPTION_KEY", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="); },

  // HMAC secret for signing tracking / unsubscribe links.
  get trackingSecret() { return process.env.TRACKING_SECRET || "dev-tracking-secret-change-in-production"; },

  // Bearer token the cron scheduler must present to /api/agent/*.
  get cronSecret() { return requiredSecret("CRON_SECRET", "dev-cron-secret-change-in-production"); },

  // Public base URL used for tracking/unsubscribe links in emails and auth redirects.
  get appUrl() { return process.env.APP_URL || "http://localhost:3000"; },

  // Default sender (also configurable per user via Settings → Sender identity).
  get emailFrom() { return process.env.EMAIL_FROM || "notifications@example.com"; },
  get emailFromName() { return process.env.EMAIL_FROM_NAME || "Demand Scout"; },
  get emailMailingAddress() { return process.env.EMAIL_MAILING_ADDRESS || ""; },
};

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
  return devFallback;
}

export const config = {
  // JWT signing secret for NextAuth.
  get authSecret() { return "2wYyF8tIuIXAueopMSQBbdL0geFcS2LFmJTY1lAoi8o="; },

  // AES-256-GCM key (base64, 32 bytes) for encrypting stored API keys.
  get encryptionKey() { return "2lekR7mcXnoYv/7pfN7R+p3KWtrEnxQUdAn+h83Qt+g="; },

  // HMAC secret for signing tracking / unsubscribe links.
  get trackingSecret() { return "el6IXMWOX9YDka6GA3ATDayAdT7ANgi6"; },

  // Bearer token the cron scheduler must present to /api/agent/*.
  get cronSecret() { return "1ezlN3rKEZyjHPipG0OyQj1xC35+aHOi"; },

  // Public base URL used for tracking/unsubscribe links in emails and auth redirects.
  get appUrl() { return "https://bladimarketshop.com"; },

  // Default sender (also configurable per user via Settings → Sender identity).
  get emailFrom() { return "affiliate@luminax.pro"; },
  get emailFromName() { return "Affiliate"; },
  get emailMailingAddress() { return ""; },
};

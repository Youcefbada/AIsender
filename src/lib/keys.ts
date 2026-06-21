import { prisma } from "./db";
import { encryptSecret, decryptSecret } from "./crypto";
import type { KeyProvider } from "@prisma/client";
import type { Provider } from "./ai/models";

// Per-user encrypted API keys (AES-256-GCM). Each user enters their own keys in
// Settings, so anyone can run the platform on their own free tiers. Resolution
// helpers below fall back to the system/env key when a user hasn't set one.

const LABEL = "default"; // one key per provider per user

export async function saveUserKey(
  userId: string,
  provider: KeyProvider,
  value: string,
): Promise<void> {
  const enc = encryptSecret(value);
  await prisma.apiKey.upsert({
    where: { userId_provider_label: { userId, provider, label: LABEL } },
    create: { userId, provider, label: LABEL, ciphertext: enc.ciphertext, iv: enc.iv, authTag: enc.authTag },
    update: { ciphertext: enc.ciphertext, iv: enc.iv, authTag: enc.authTag },
  });
}

export async function deleteUserKey(userId: string, provider: KeyProvider): Promise<void> {
  await prisma.apiKey.deleteMany({ where: { userId, provider, label: LABEL } });
}

/** Which providers the user has configured (for masked display in the UI). */
export async function listUserKeyProviders(userId: string): Promise<KeyProvider[]> {
  const rows = await prisma.apiKey.findMany({ where: { userId }, select: { provider: true } });
  return rows.map((r) => r.provider);
}

export async function getUserSecret(
  userId: string,
  provider: KeyProvider,
): Promise<string | null> {
  const row = await prisma.apiKey.findUnique({
    where: { userId_provider_label: { userId, provider, label: LABEL } },
  });
  if (!row) return null;
  try {
    return decryptSecret({ ciphertext: row.ciphertext, iv: row.iv, authTag: row.authTag });
  } catch {
    return null;
  }
}

/** AI provider keys for the LLM client (user key takes precedence over env). */
export async function getUserProviderKeys(
  userId: string,
): Promise<Partial<Record<Provider, string>>> {
  const rows = await prisma.apiKey.findMany({
    where: { userId, provider: { in: ["GEMINI", "GROQ", "OPENROUTER"] } },
  });
  const out: Partial<Record<Provider, string>> = {};
  for (const r of rows) {
    try {
      const v = decryptSecret({ ciphertext: r.ciphertext, iv: r.iv, authTag: r.authTag });
      if (r.provider === "GEMINI") out.gemini = v;
      else if (r.provider === "GROQ") out.groq = v;
      else if (r.provider === "OPENROUTER") out.openrouter = v;
    } catch {
      /* skip undecryptable */
    }
  }
  return out;
}

export interface SmtpCreds {
  host: string;
  port?: number;
  user?: string;
  pass?: string;
}

export interface EmailCreds {
  resendApiKey?: string;
  smtp?: SmtpCreds;
}

/** Email-sending creds: user's Resend key and/or SMTP (Brevo) settings. */
export async function getUserEmailCreds(userId: string): Promise<EmailCreds> {
  const out: EmailCreds = {};
  const resend = await getUserSecret(userId, "RESEND");
  if (resend) out.resendApiKey = resend;
  const smtpRaw = await getUserSecret(userId, "SMTP");
  if (smtpRaw) {
    try {
      out.smtp = JSON.parse(smtpRaw) as SmtpCreds;
    } catch {
      /* ignore malformed */
    }
  }
  return out;
}

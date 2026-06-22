import { prisma } from "./db";

// Quota / anti-abuse counters backed by the UsageCounter table (durable, works
// across serverless invocations — no in-memory state to lose). Use day-window
// keys for sending and AI spend caps.

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

export const QUOTAS = {
  "emails:day": 100, // hard ceiling on drafts/day (sending is capped per-campaign)
  "discovery:day": 500, // leads discovered per user/day
  "ai:calls:day": 3000,
} as const;

export type QuotaScope = keyof typeof QUOTAS;

export async function consumeQuota(
  userId: string,
  scope: QuotaScope,
  amount = 1,
): Promise<{ allowed: boolean; remaining: number }> {
  const windowKey = dayKey();
  const limit = QUOTAS[scope];

  const row = await prisma.usageCounter.upsert({
    where: { userId_scope_windowKey: { userId, scope, windowKey } },
    create: { userId, scope, windowKey, count: 0 },
    update: {},
  });

  if (row.count + amount > limit) {
    return { allowed: false, remaining: Math.max(0, limit - row.count) };
  }

  const updated = await prisma.usageCounter.update({
    where: { id: row.id },
    data: { count: { increment: amount } },
  });
  return { allowed: true, remaining: limit - updated.count };
}

export async function peekQuota(
  userId: string,
  scope: QuotaScope,
): Promise<{ used: number; limit: number }> {
  const row = await prisma.usageCounter.findUnique({
    where: { userId_scope_windowKey: { userId, scope, windowKey: dayKey() } },
  });
  return { used: row?.count ?? 0, limit: QUOTAS[scope] };
}

import { prisma } from "./db";

// Quota / anti-abuse counters backed by the UsageCounter table (durable, works
// across serverless invocations — no in-memory state to lose). Use day-window
// keys for sending and AI spend caps.

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

export const QUOTAS: Record<string, number> = {
  "emails:day": parseInt(process.env.DAILY_EMAIL_LIMIT || "20", 10), // Default 20 emails/day
  "discovery:day": parseInt(process.env.DAILY_DISCOVERY_LIMIT || "30", 10), // Default 30 opportunities/day
  "ai:calls:day": 1500,
};

export type QuotaScope = "emails:day" | "discovery:day" | "ai:calls:day";

export async function consumeQuota(
  userId: string,
  scope: QuotaScope,
  amount = 1,
): Promise<{ allowed: boolean; remaining: number }> {
  const windowKey = dayKey();
  const limit = QUOTAS[scope] ?? 100;

  const row = await prisma.usageCounter.upsert({
    where: { userId_scope_windowKey: { userId, scope, windowKey } },
    create: { userId, scope, windowKey, count: 0 },
    update: {},
  });

  const allowed = row.count + amount <= limit;
  // Partial usage is always recorded: even when over limit, consume whatever
  // room remains so the counter can never be bypassed by repeated over-limit
  // calls. A single atomic UPDATE (rather than upsert + increment) closes the
  // race between concurrent requests.
  const { newCount } = await prisma.$transaction(async (tx) => {
    const current = await tx.usageCounter.findUnique({
      where: { id: row.id }
    });
    const currentCount = current?.count ?? 0;
    const actualDelta = (currentCount + amount <= limit) ? amount : Math.max(0, limit - currentCount);
    
    if (actualDelta === 0) {
      return { newCount: currentCount };
    }

    const updated = await tx.usageCounter.update({
      where: { id: row.id },
      data: { count: { increment: actualDelta } }
    });
    
    return { newCount: updated.count };
  });

  return { allowed, remaining: Math.max(0, limit - newCount) };
}

export async function peekQuota(
  userId: string,
  scope: QuotaScope,
): Promise<{ used: number; limit: number }> {
  const row = await prisma.usageCounter.findUnique({
    where: { userId_scope_windowKey: { userId, scope, windowKey: dayKey() } },
  });
  return { used: row?.count ?? 0, limit: QUOTAS[scope] ?? 100 };
}

export async function getUsageSummary(userId: string) {
  const [discovery, emails] = await Promise.all([
    peekQuota(userId, "discovery:day"),
    peekQuota(userId, "emails:day"),
  ]);

  return {
    discovery: {
      used: discovery.used,
      limit: discovery.limit,
    },
    emails: {
      used: emails.used,
      limit: emails.limit,
    },
  };
}

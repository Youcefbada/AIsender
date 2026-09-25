import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuotaTracker } from "@/components/quota-tracker";
import { getI18n } from "@/lib/i18n/server";

export default async function DashboardPage() {
  const userId = await requirePageUser();
  const { t } = await getI18n();

  const [topOpportunities, opportunityCounts, pending, emailCounts, leadCounts] =
    await Promise.all([
      prisma.opportunity.findMany({
        where: { userId, status: { in: ["NEW", "SAVED"] } },
        orderBy: [{ overallScore: "desc" }, { createdAt: "desc" }],
        take: 3,
        include: { productProfile: { select: { name: true } } },
      }),
      prisma.opportunity.groupBy({
        by: ["status"],
        where: { userId },
        _count: true,
      }),
      prisma.emailMessage.findMany({
        where: { userId, status: "PENDING_APPROVAL" },
        include: { lead: { include: { score: true } }, contact: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.emailMessage.groupBy({ by: ["status"], where: { userId }, _count: true }),
      prisma.lead.groupBy({ by: ["status"], where: { userId }, _count: true }),
    ]);

  const es = (s: string) => emailCounts.find((c) => c.status === s)?._count ?? 0;
  const ls = (s: string) => leadCounts.find((c) => c.status === s)?._count ?? 0;
  const os = (s: string) => opportunityCounts.find((c) => c.status === s)?._count ?? 0;

  const totalOpportunities = opportunityCounts.reduce((acc, c) => acc + c._count, 0);

  const sent = es("SENT") + es("DELIVERED") + es("OPENED") + es("CLICKED") + es("REPLIED");
  const opened = es("OPENED") + es("CLICKED") + es("REPLIED");
  const clicked = es("CLICKED");
  const replied = es("REPLIED");
  const rate = (n: number) => (sent ? `${Math.round((n / sent) * 100)}%` : "—");

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Demand Intelligence & Scout Dashboard</h1>
            <p className="text-xs text-[var(--muted-foreground)]">
              Real-time monitoring of people & businesses expressing demand for software and AI.
            </p>
          </div>
          <Link
            href="/opportunities"
            className="inline-flex items-center justify-center rounded-md bg-[var(--foreground)] px-4 py-2 text-xs font-medium text-[var(--background)] hover:opacity-90"
          >
            ⚡ Open Opportunities Scout
          </Link>
        </div>

        <QuotaTracker />

        {/* Opportunity Metrics Row */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--muted-foreground)] mb-3">
            Demand Scout Opportunities
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{totalOpportunities}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Total Discovered</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">{os("NEW")}</div>
                <div className="text-xs text-[var(--muted-foreground)]">New / Unreviewed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{os("SAVED")}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Saved Opportunities</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{os("CONTACTED")}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Contacted Prospects</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Top High-Intent Demand Discoveries */}
        {topOpportunities.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">🔥 Top High-Intent Demand Discoveries</h2>
              <Link href="/opportunities" className="text-xs underline text-[var(--muted-foreground)]">
                View all opportunities →
              </Link>
            </div>
            <div className="space-y-3">
              {topOpportunities.map((opp) => (
                <Card key={opp.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Badge tone={opp.platform === "REDDIT" ? "amber" : "blue"}>{opp.platform}</Badge>
                      <span className="text-xs font-medium">
                        {opp.authorUsername ? `@${opp.authorUsername}` : opp.companyName || "Prospect"}
                      </span>
                      {opp.productProfile && (
                        <span className="text-xs text-[var(--muted-foreground)]">
                          · for {opp.productProfile.name}
                        </span>
                      )}
                    </div>
                    <Badge tone="green">Score: {opp.overallScore}/100</Badge>
                  </div>
                  <div className="font-medium text-sm">{opp.detectedNeed || opp.originalText.slice(0, 80)}</div>
                  {opp.whyThisIsAnOpportunity && (
                    <p className="mt-1 text-xs text-[var(--muted-foreground)] line-clamp-2">
                      {opp.whyThisIsAnOpportunity}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between pt-2 border-t">
                    <a
                      href={opp.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-orange-600 hover:underline"
                    >
                      ↗ Open Original Source Post
                    </a>
                    <Link href="/opportunities" className="text-xs font-medium hover:underline">
                      Review & Contact →
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Legacy Outreach Queue (Preserved) */}
        <div className="border-t pt-6" style={{ borderColor: "var(--border)" }}>
          <details className="space-y-4">
            <summary className="cursor-pointer text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              ✉ Cold Outreach & Approvals Queue ({pending.length} pending)
            </summary>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  [t.dashboard.sent, sent],
                  [t.dashboard.openRate, rate(opened)],
                  [t.dashboard.clickRate, rate(clicked)],
                  [t.dashboard.replyRate, rate(replied)],
                ].map(([label, v]) => (
                  <Card key={label as string}>
                    <CardContent className="p-4">
                      <div className="text-2xl font-semibold">{v as string | number}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-3">
                {pending.length === 0 && (
                  <p className="text-xs text-[var(--muted-foreground)]">No pending email drafts.</p>
                )}
                {pending.map((e) => (
                  <Card key={e.id}>
                    <CardContent className="p-3 text-xs">
                      <div className="font-medium">
                        {e.lead.company} · {e.contact?.email}
                      </div>
                      <div className="mt-1 font-semibold">{e.subject}</div>
                      <p className="line-clamp-2 text-[var(--muted-foreground)]">{e.bodyText}</p>
                    </CardContent>
                  </Card>
                ))}
                {pending.length > 0 && (
                  <Link href="/emails" className="text-xs underline">
                    Review and approve emails in queue →
                  </Link>
                )}
              </div>
            </div>
          </details>
        </div>
      </div>
    </AppShell>
  );
}

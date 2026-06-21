import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getI18n } from "@/lib/i18n/server";

// Approval-queue-first dashboard (STEP 8). The daily human action is approving
// drafts, so it leads. Funnel counts make "quality over quantity" visible.
export default async function DashboardPage() {
  const userId = await requirePageUser();
  const { t } = await getI18n();

  const [pending, emailCounts, leadCounts] = await Promise.all([
    prisma.emailMessage.findMany({
      where: { userId, status: "PENDING_APPROVAL" },
      include: { lead: { include: { score: true } }, contact: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.emailMessage.groupBy({ by: ["status"], where: { userId }, _count: true }),
    prisma.lead.groupBy({ by: ["status"], where: { userId }, _count: true }),
  ]);

  const es = (s: string) => emailCounts.find((c) => c.status === s)?._count ?? 0;
  const ls = (s: string) => leadCounts.find((c) => c.status === s)?._count ?? 0;

  const sent = es("SENT") + es("DELIVERED") + es("OPENED") + es("CLICKED") + es("REPLIED");
  const opened = es("OPENED") + es("CLICKED") + es("REPLIED");
  const clicked = es("CLICKED");
  const replied = es("REPLIED");
  const rate = (n: number) => (sent ? `${Math.round((n / sent) * 100)}%` : "—");

  return (
    <AppShell>
      <h1 className="text-xl font-semibold">{t.dashboard.title}</h1>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          [t.dashboard.sent, sent],
          [t.dashboard.openRate, rate(opened)],
          [t.dashboard.clickRate, rate(clicked)],
          [t.dashboard.replyRate, rate(replied)],
          [t.dashboard.pending, pending.length],
        ].map(([label, v]) => (
          <Card key={label as string}><CardContent className="p-4">
            <div className="text-2xl font-semibold">{v as string | number}</div>
            <div className="text-xs text-[var(--muted-foreground)]">{label}</div>
          </CardContent></Card>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <span>{t.dashboard.funnel}</span>
        <Badge>{t.dashboard.discovered} {ls("DISCOVERED")}</Badge>→
        <Badge tone="green">{t.dashboard.qualified} {ls("QUALIFIED")}</Badge>→
        <Badge tone="blue">{t.dashboard.drafted} {ls("DRAFTED")}</Badge>→
        <Badge tone="blue">{t.dashboard.contacted} {ls("CONTACTED")}</Badge>→
        <Badge tone="green">{t.dashboard.replied} {ls("REPLIED")}</Badge>
      </div>

      <h2 className="mt-8 text-lg font-medium">{t.dashboard.approvalQueue}</h2>
      <div className="mt-3 space-y-3">
        {pending.length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)]">
            {t.dashboard.nothingWaiting}{" "}
            <Link href="/campaigns" className="underline">{t.dashboard.goToCampaigns}</Link>
          </p>
        )}
        {pending.map((e) => (
          <Card key={e.id}><CardContent className="p-4">
            <div className="font-medium">
              {e.lead.company}{" "}
              <span className="text-xs text-[var(--muted-foreground)]">
                · {t.emails.score} {e.lead.score?.total ?? "—"} · {e.contact?.email}
              </span>
            </div>
            <div className="mt-1 text-sm font-medium">{e.subject}</div>
            <p className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">{e.bodyText}</p>
          </CardContent></Card>
        ))}
        {pending.length > 0 && (
          <Link href="/emails" className="text-sm underline">{t.dashboard.reviewAll}</Link>
        )}
      </div>
    </AppShell>
  );
}

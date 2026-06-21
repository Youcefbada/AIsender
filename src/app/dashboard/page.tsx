import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Approval-queue-first dashboard (STEP 8). The daily human action is approving
// drafts, so it leads. Funnel counts make "quality over quantity" visible.
export default async function DashboardPage() {
  const userId = await requirePageUser();

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
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Sent", sent],
          ["Open rate", rate(opened)],
          ["Click rate", rate(clicked)],
          ["Reply rate", rate(replied)],
          ["Pending", pending.length],
        ].map(([label, v]) => (
          <Card key={label as string}><CardContent className="p-4">
            <div className="text-2xl font-semibold">{v as string | number}</div>
            <div className="text-xs text-[var(--muted-foreground)]">{label}</div>
          </CardContent></Card>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <span>Funnel:</span>
        <Badge>Discovered {ls("DISCOVERED")}</Badge>→
        <Badge tone="green">Qualified {ls("QUALIFIED")}</Badge>→
        <Badge tone="blue">Drafted {ls("DRAFTED")}</Badge>→
        <Badge tone="blue">Contacted {ls("CONTACTED")}</Badge>→
        <Badge tone="green">Replied {ls("REPLIED")}</Badge>
      </div>

      <h2 className="mt-8 text-lg font-medium">Approval queue</h2>
      <div className="mt-3 space-y-3">
        {pending.length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)]">
            Nothing waiting. The agent queues drafts on its next run.{" "}
            <Link href="/campaigns" className="underline">Go to campaigns →</Link>
          </p>
        )}
        {pending.map((e) => (
          <Card key={e.id}><CardContent className="p-4">
            <div className="font-medium">
              {e.lead.company}{" "}
              <span className="text-xs text-[var(--muted-foreground)]">
                · score {e.lead.score?.total ?? "—"} · {e.contact?.email}
              </span>
            </div>
            <div className="mt-1 text-sm font-medium">{e.subject}</div>
            <p className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">{e.bodyText}</p>
          </CardContent></Card>
        ))}
        {pending.length > 0 && (
          <Link href="/emails" className="text-sm underline">Review all in approval queue →</Link>
        )}
      </div>
    </AppShell>
  );
}

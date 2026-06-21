import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/forms/action-button";

export default async function EmailsPage() {
  const userId = await requirePageUser();
  const pending = await prisma.emailMessage.findMany({
    where: { userId, status: "PENDING_APPROVAL" },
    orderBy: { createdAt: "desc" },
    include: { lead: { include: { score: true } }, contact: true, campaign: { select: { name: true } } },
    take: 50,
  });

  return (
    <AppShell>
      <h1 className="text-xl font-semibold">Approval queue</h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Review each draft. Approve to release it to the send queue (throttled to the
        campaign's daily limit + send window), or cancel to discard.
      </p>

      <div className="mt-5 space-y-4">
        {pending.length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)]">
            Nothing waiting. Run a campaign pipeline to generate drafts.
          </p>
        )}
        {pending.map((e) => (
          <Card key={e.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium">
                    {e.lead.company}{" "}
                    <span className="text-xs text-[var(--muted-foreground)]">
                      · {e.contact?.email} · {e.campaign.name}
                    </span>
                  </div>
                  <Badge tone="green" className="mt-1">score {e.lead.score?.total ?? "—"}</Badge>
                </div>
                <div className="flex gap-2">
                  <ActionButton size="sm" endpoint={`/api/emails/${e.id}/approve`} idle="Approve" busy="…" />
                  <ActionButton size="sm" variant="outline" endpoint={`/api/emails/${e.id}/cancel`} idle="Cancel" busy="…" confirm="Discard this draft?" />
                </div>
              </div>
              <div className="mt-3 rounded-md border p-3 text-sm" style={{ borderColor: "var(--border)" }}>
                <div className="font-medium">{e.subject}</div>
                <p className="mt-2 whitespace-pre-wrap text-[var(--muted-foreground)]">{e.bodyText}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

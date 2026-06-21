import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/forms/action-button";
import { getI18n } from "@/lib/i18n/server";

export default async function EmailsPage() {
  const userId = await requirePageUser();
  const { t } = await getI18n();
  const pending = await prisma.emailMessage.findMany({
    where: { userId, status: "PENDING_APPROVAL" },
    orderBy: { createdAt: "desc" },
    include: { lead: { include: { score: true } }, contact: true, campaign: { select: { name: true } } },
    take: 50,
  });

  return (
    <AppShell>
      <h1 className="text-xl font-semibold">{t.emails.title}</h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{t.emails.subtitle}</p>

      <div className="mt-5 space-y-4">
        {pending.length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)]">{t.emails.nothing}</p>
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
                  <Badge tone="green" className="mt-1">{t.emails.score} {e.lead.score?.total ?? "—"}</Badge>
                </div>
                <div className="flex gap-2">
                  <ActionButton size="sm" endpoint={`/api/emails/${e.id}/approve`} idle={t.common.approve} busy="…" />
                  <ActionButton size="sm" variant="outline" endpoint={`/api/emails/${e.id}/cancel`} idle={t.common.cancel} busy="…" confirm={t.emails.discardConfirm} />
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

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/forms/action-button";
import { CsvImport } from "@/components/forms/csv-import";
import { CampaignEditForm } from "@/components/forms/campaign-edit-form";
import { getI18n } from "@/lib/i18n/server";

export default async function CampaignDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requirePageUser();
  const { t } = await getI18n();
  const { id } = await params;
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId },
    include: { product: true, icp: true },
  });
  if (!campaign) notFound();

  const [leads, emails, lastRun] = await Promise.all([
    prisma.lead.findMany({
      where: { campaignId: id },
      orderBy: { scoreTotal: "desc" },
      include: { score: true },
      take: 50,
    }),
    prisma.emailMessage.groupBy({ by: ["status"], where: { campaignId: id }, _count: true }),
    prisma.agentRun.findFirst({ where: { campaignId: id }, orderBy: { startedAt: "desc" } }),
  ]);
  const emailStat = (s: string) => emails.find((e) => e.status === s)?._count ?? 0;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{campaign.name}</h1>
          <div className="text-xs text-[var(--muted-foreground)]">
            {campaign.product.name} · {t.campaignForm.minScore} {campaign.minScore} · {campaign.dailyLimit}/d ·{" "}
            {campaign.autoSend ? t.campaigns.autoSend : t.campaigns.approval}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton endpoint={`/api/campaigns/${id}/run`} idle={t.campaigns.runNow} busy={t.campaigns.running} />
          <ActionButton
            endpoint={`/api/campaigns/${id}`}
            method="PATCH"
            variant="outline"
            body={{ status: campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE" }}
            idle={campaign.status === "ACTIVE" ? t.common.pause : t.common.resume}
            busy="…"
          />
          <ActionButton
            endpoint={`/api/campaigns/${id}`}
            method="DELETE"
            variant="destructive"
            idle={t.common.delete}
            busy="…"
            confirm={t.common.deleteCampaignConfirm}
            redirectTo="/campaigns"
          />
        </div>
      </div>

      <div className="mt-2"><CampaignEditForm campaign={{ id: campaign.id, name: campaign.name, dailyLimit: campaign.dailyLimit, minScore: campaign.minScore, autoSend: campaign.autoSend }} /></div>

      {lastRun && (
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
          {t.campaigns.lastRun} {lastRun.status} · {JSON.stringify(lastRun.stats ?? {})}
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [t.campaigns.drafted, emailStat("PENDING_APPROVAL") + emailStat("APPROVED")],
          [t.campaigns.sent, emailStat("SENT") + emailStat("DELIVERED") + emailStat("OPENED") + emailStat("CLICKED")],
          [t.campaigns.opened, emailStat("OPENED") + emailStat("CLICKED")],
          [t.campaigns.replied, emailStat("REPLIED")],
        ].map(([l, n]) => (
          <Card key={l as string}><CardContent className="p-4">
            <div className="text-2xl font-semibold">{n as number}</div>
            <div className="text-xs text-[var(--muted-foreground)]">{l}</div>
          </CardContent></Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader><CardTitle>{t.campaigns.leadsTitle}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {leads.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">{t.campaigns.noLeads}</p>}
            {leads.map((l) => (
              <div key={l.id} className="flex items-center justify-between border-b py-1 text-sm" style={{ borderColor: "var(--border)" }}>
                <div>
                  <span className="font-medium">{l.company}</span>{" "}
                  <span className="text-xs text-[var(--muted-foreground)]">{l.domain}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={l.scoreTotal >= campaign.minScore ? "green" : "default"}>{l.scoreTotal}</Badge>
                  <Badge>{l.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t.campaigns.importLeads}</CardTitle></CardHeader>
          <CardContent><CsvImport campaignId={id} /></CardContent>
        </Card>
      </div>

      <p className="mt-4 text-sm">
        <Link href="/emails" className="underline">{t.campaigns.reviewDrafts}</Link>
      </p>
    </AppShell>
  );
}

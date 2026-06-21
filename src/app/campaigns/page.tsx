import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function CampaignsPage() {
  const userId = await requirePageUser();
  const campaigns = await prisma.campaign.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { name: true } },
      _count: { select: { leads: true, emails: true } },
    },
  });

  return (
    <AppShell>
      <h1 className="text-xl font-semibold">Campaigns</h1>
      <div className="mt-4 space-y-3">
        {campaigns.length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)]">
            No campaigns yet. Open a product and launch one.
          </p>
        )}
        {campaigns.map((c) => (
          <Link key={c.id} href={`/campaigns/${c.id}`}>
            <Card className="transition-colors hover:bg-[var(--muted)]">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{c.product.name}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={c.status === "ACTIVE" ? "green" : "default"}>{c.status}</Badge>
                  <Badge>{c._count.leads} leads</Badge>
                  <Badge>{c._count.emails} emails</Badge>
                  <Badge tone={c.autoSend ? "amber" : "blue"}>{c.autoSend ? "auto-send" : "approval"}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}

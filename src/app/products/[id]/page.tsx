import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/forms/action-button";
import { CampaignForm } from "@/components/forms/campaign-form";

export default async function ProductDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requirePageUser();
  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: { id, userId },
    include: { analysis: true, icps: { orderBy: { priority: "desc" } } },
  });
  if (!product) notFound();

  const senderIdentities = await prisma.senderIdentity.findMany({ where: { userId } });
  const a = product.analysis;
  const list = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{product.name}</h1>
          <a href={product.url} className="text-xs text-[var(--muted-foreground)]" target="_blank">{product.url}</a>
        </div>
        <ActionButton
          endpoint={`/api/products/${product.id}/analyze`}
          idle={a ? "Re-analyze" : "Analyze product"}
          busy="Analyzing…"
        />
      </div>

      <p className="mt-3 text-sm text-[var(--muted-foreground)]">{product.description}</p>

      {!a && (
        <p className="mt-6 text-sm text-[var(--muted-foreground)]">
          Run analysis to generate ICPs, personas, and outreach angles.
        </p>
      )}

      {a && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Analysis</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{a.summary}</p>
              <div className="flex flex-wrap gap-1">
                <Badge tone="blue">{a.audienceType}</Badge>
                {a.pricingTier && <Badge>{a.pricingTier}</Badge>}
                {a.buyingIntent && <Badge tone="amber">intent: {a.buyingIntent}</Badge>}
              </div>
              <Section title="Benefits" items={list(a.benefits)} />
              <Section title="Pain points" items={list(a.painPoints)} />
              <Section title="Outreach angles" items={list(a.outreachAngles)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Ideal customer profiles</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {product.icps.map((icp) => (
                <div key={icp.id} className="rounded-md border p-3" style={{ borderColor: "var(--border)" }}>
                  <div className="font-medium">{icp.name}</div>
                  <p className="text-[var(--muted-foreground)]">{icp.persona}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {icp.industry && <Badge>{icp.industry}</Badge>}
                    {icp.companySize && <Badge>{icp.companySize}</Badge>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {a && (
        <Card className="mt-6">
          <CardHeader><CardTitle>Launch a campaign</CardTitle></CardHeader>
          <CardContent>
            <CampaignForm
              productId={product.id}
              icps={product.icps.map((i) => ({ id: i.id, name: i.name }))}
              senderIdentities={senderIdentities.map((s) => ({ id: s.id, fromName: s.fromName, fromEmail: s.fromEmail }))}
            />
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="font-medium">{title}</div>
      <ul className="ml-4 list-disc text-[var(--muted-foreground)]">
        {items.map((x, i) => <li key={i}>{x}</li>)}
      </ul>
    </div>
  );
}

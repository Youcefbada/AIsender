import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CsvImport } from "@/components/forms/csv-import";

const toneFor = (status: string) =>
  status === "QUALIFIED" || status === "DRAFTED" ? "green"
  : status === "DISQUALIFIED" || status === "BOUNCED" || status === "UNSUBSCRIBED" ? "red"
  : status === "CONTACTED" || status === "REPLIED" ? "blue"
  : "default";

export default async function LeadsPage() {
  const userId = await requirePageUser();
  const leads = await prisma.lead.findMany({
    where: { userId },
    orderBy: [{ scoreTotal: "desc" }, { createdAt: "desc" }],
    include: { score: true, contacts: true },
    take: 200,
  });

  return (
    <AppShell>
      <div className="grid gap-8 md:grid-cols-[1fr_360px]">
        <div>
          <h1 className="text-xl font-semibold">Leads</h1>
          <div className="mt-4 space-y-2">
            {leads.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">No leads yet. Import a CSV →</p>}
            {leads.map((l) => (
              <Card key={l.id}>
                <CardContent className="flex items-center justify-between p-3 text-sm">
                  <div>
                    <div className="font-medium">{l.company}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {l.contacts[0]?.email ?? l.domain ?? "no contact"} · {l.source}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={l.scoreTotal >= 80 ? "green" : "default"}>score {l.scoreTotal}</Badge>
                    <Badge tone={toneFor(l.status)}>{l.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-medium text-[var(--muted-foreground)]">Import leads</h2>
          <Card className="mt-3"><CardContent className="p-4"><CsvImport /></CardContent></Card>
        </div>
      </div>
    </AppShell>
  );
}

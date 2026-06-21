import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SenderIdentityForm } from "@/components/forms/sender-identity-form";
import { ApiKeysForm } from "@/components/forms/api-keys-form";

export default async function SettingsPage() {
  const userId = await requirePageUser();
  const identities = await prisma.senderIdentity.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell>
      <h1 className="text-xl font-semibold">Settings</h1>

      <Card className="mt-5">
        <CardHeader><CardTitle>API keys</CardTitle></CardHeader>
        <CardContent><ApiKeysForm /></CardContent>
      </Card>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Sender identities</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {identities.length === 0 && (
              <p className="text-[var(--muted-foreground)]">
                Add a verified sending identity before launching campaigns.
              </p>
            )}
            {identities.map((s) => (
              <div key={s.id} className="flex items-center justify-between border-b py-2" style={{ borderColor: "var(--border)" }}>
                <div>
                  <div className="font-medium">{s.fromName}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{s.fromEmail} · {s.channel}</div>
                </div>
                <Badge tone={s.verified ? "green" : "amber"}>{s.verified ? "verified" : "unverified"}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Add sender identity</CardTitle></CardHeader>
          <CardContent><SenderIdentityForm /></CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>Deliverability checklist</CardTitle></CardHeader>
        <CardContent className="text-sm text-[var(--muted-foreground)]">
          <ul className="ml-4 list-disc space-y-1">
            <li>Authenticate your domain in Resend (SPF, DKIM, DMARC).</li>
            <li>Warm up new domains slowly — keep daily volume low at first.</li>
            <li>Every email carries unsubscribe + your mailing address automatically.</li>
            <li>Bounces and complaints auto-add to your suppression list.</li>
          </ul>
        </CardContent>
      </Card>
    </AppShell>
  );
}

import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SenderIdentityForm } from "@/components/forms/sender-identity-form";
import { ApiKeysForm } from "@/components/forms/api-keys-form";
import { ActionButton } from "@/components/forms/action-button";
import { getI18n } from "@/lib/i18n/server";

export default async function SettingsPage() {
  const userId = await requirePageUser();
  const { t } = await getI18n();
  const identities = await prisma.senderIdentity.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell>
      <h1 className="text-xl font-semibold">{t.settings.title}</h1>

      <Card className="mt-5">
        <CardHeader><CardTitle>{t.settings.apiKeys}</CardTitle></CardHeader>
        <CardContent><ApiKeysForm /></CardContent>
      </Card>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t.settings.senderIdentities}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {identities.length === 0 && (
              <p className="text-[var(--muted-foreground)]">{t.settings.noSenders}</p>
            )}
            {identities.map((s) => (
              <div key={s.id} className="flex items-center justify-between border-b py-2" style={{ borderColor: "var(--border)" }}>
                <div>
                  <div className="font-medium">{s.fromName}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{s.fromEmail} · {s.channel}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={s.verified ? "green" : "amber"}>{s.verified ? t.settings.verified : t.settings.unverified}</Badge>
                  <ActionButton
                    endpoint={`/api/sender-identities/${s.id}`}
                    method="DELETE"
                    variant="ghost"
                    size="sm"
                    idle={t.common.remove}
                    busy="…"
                    confirm={t.common.deleteSenderConfirm}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t.settings.addSender}</CardTitle></CardHeader>
          <CardContent><SenderIdentityForm /></CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>{t.settings.deliverability}</CardTitle></CardHeader>
        <CardContent className="text-sm text-[var(--muted-foreground)]">
          <ul className="ml-4 list-disc space-y-1">
            {t.settings.checklist.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </CardContent>
      </Card>
    </AppShell>
  );
}

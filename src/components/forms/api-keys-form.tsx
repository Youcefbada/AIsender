"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/i18n-provider";

type Provider = "GEMINI" | "GROQ" | "OPENROUTER" | "RESEND" | "SERPER" | "SMTP" | "REDDIT" | "HUNTER";

const SIMPLE: { provider: Provider; label: string; hint: string }[] = [
  { provider: "GEMINI", label: "Google Gemini API key", hint: "AI (primary) · free ~1,500/day · aistudio.google.com/apikey" },
  { provider: "GROQ", label: "Groq API key", hint: "AI fallback · free · console.groq.com/keys" },
  { provider: "OPENROUTER", label: "OpenRouter API key", hint: "AI fallback · openrouter.ai/keys" },
  { provider: "SERPER", label: "Serper.dev API key", hint: "Web & Google demand discovery · free 2,500/mo · serper.dev" },
  { provider: "REDDIT", label: "Reddit API token / client secret (Optional)", hint: "For authenticated Reddit search (public search works without key)" },
  { provider: "HUNTER", label: "Hunter.io API key (Optional)", hint: "Contact enrichment adapter · free tier 50/mo · hunter.io" },
  { provider: "RESEND", label: "Resend API key", hint: "Human-approved email sending · free 100/day · resend.com" },
];

export function ApiKeysForm() {
  const { t } = useI18n();
  const [saved, setSaved] = useState<Provider[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/keys");
    if (res.ok) setSaved((await res.json()).providers ?? []);
  }
  useEffect(() => { refresh(); }, []);

  async function save(provider: Provider, value: string) {
    if (!value.trim()) return;
    setBusy(provider);
    await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, value }),
    });
    setValues((v) => ({ ...v, [provider]: "", smtpHost: provider === "SMTP" ? "" : v.smtpHost }));
    setBusy(null);
    refresh();
  }

  async function remove(provider: Provider) {
    setBusy(provider);
    await fetch(`/api/keys?provider=${provider}`, { method: "DELETE" });
    setBusy(null);
    refresh();
  }

  async function saveSmtp() {
    const smtp = {
      host: values.smtpHost ?? "",
      port: Number(values.smtpPort || 587),
      user: values.smtpUser ?? "",
      pass: values.smtpPass ?? "",
    };
    if (!smtp.host) return;
    await save("SMTP", JSON.stringify(smtp));
  }

  return (
    <div className="space-y-4 text-sm">
      <p className="text-[var(--muted-foreground)]">{t.settings.apiKeysIntro}</p>

      {SIMPLE.map(({ provider, label, hint }) => (
        <div key={provider} className="rounded-md border p-3" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between">
            <label className="font-medium">{label}</label>
            {saved.includes(provider) ? <Badge tone="green">{t.settings.saved}</Badge> : <Badge tone="amber">{t.settings.notSet}</Badge>}
          </div>
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">{hint}</div>
          <div className="mt-2 flex gap-2">
            <Input
              type="password"
              placeholder={saved.includes(provider) ? t.settings.enterToReplace : t.settings.pasteKey}
              value={values[provider] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [provider]: e.target.value }))}
            />
            <Button size="sm" disabled={busy === provider} onClick={() => save(provider, values[provider] ?? "")}>{t.common.save}</Button>
            {saved.includes(provider) && (
              <Button size="sm" variant="outline" disabled={busy === provider} onClick={() => remove(provider)}>{t.common.remove}</Button>
            )}
          </div>
        </div>
      ))}

      {/* SMTP (Brevo etc.) — multiple fields stored together */}
      <div className="rounded-md border p-3" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between">
          <label className="font-medium">{t.settings.smtpTitle}</label>
          {saved.includes("SMTP") ? <Badge tone="green">{t.settings.saved}</Badge> : <Badge tone="amber">{t.settings.notSet}</Badge>}
        </div>
        <div className="mt-1 text-xs text-[var(--muted-foreground)]">{t.settings.smtpHint}</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Input placeholder={t.settings.host} value={values.smtpHost ?? ""} onChange={(e) => setValues((v) => ({ ...v, smtpHost: e.target.value }))} />
          <Input placeholder={t.settings.port} value={values.smtpPort ?? ""} onChange={(e) => setValues((v) => ({ ...v, smtpPort: e.target.value }))} />
          <Input placeholder={t.settings.user} value={values.smtpUser ?? ""} onChange={(e) => setValues((v) => ({ ...v, smtpUser: e.target.value }))} />
          <Input type="password" placeholder={t.settings.password} value={values.smtpPass ?? ""} onChange={(e) => setValues((v) => ({ ...v, smtpPass: e.target.value }))} />
        </div>
        <div className="mt-2 flex gap-2">
          <Button size="sm" disabled={busy === "SMTP"} onClick={saveSmtp}>{t.settings.saveSmtp}</Button>
          {saved.includes("SMTP") && (
            <Button size="sm" variant="outline" disabled={busy === "SMTP"} onClick={() => remove("SMTP")}>{t.common.remove}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

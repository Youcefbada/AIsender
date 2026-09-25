"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/components/i18n-provider";

export function CsvImport({ campaignId }: { campaignId?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [csv, setCsv] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function importCsv() {
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/leads/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv, campaignId }),
    });
    setLoading(false);
    const j = await res.json();
    setResult(res.ok ? `Imported ${j.imported}, skipped ${j.skipped}` : j.error ?? "Failed");
    if (res.ok) { setCsv(""); router.refresh(); }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setCsv(await f.text());
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--muted-foreground)]">{t.csv.headers}</p>
      <input type="file" accept=".csv,text/csv" onChange={onFile} className="text-sm" aria-label={t.csv.file} />
      <Textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder={t.csv.paste}
        aria-label={t.csv.paste}
        className="min-h-[140px] font-mono text-xs"
      />
      {result && <p className="text-sm">{result}</p>}
      <Button onClick={importCsv} disabled={loading || !csv.trim()}>
        {loading ? t.csv.importing : t.csv.import}
      </Button>
    </div>
  );
}

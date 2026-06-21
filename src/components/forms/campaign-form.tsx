"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  productId: string;
  icps: { id: string; name: string }[];
  senderIdentities: { id: string; fromName: string; fromEmail: string }[];
}

export function CampaignForm({ productId, icps, senderIdentities }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        name: fd.get("name"),
        icpId: fd.get("icpId") || undefined,
        dailyLimit: Number(fd.get("dailyLimit")),
        minScore: Number(fd.get("minScore")),
        autoSend: fd.get("autoSend") === "on",
        senderIdentityId: fd.get("senderIdentityId") || undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) { setError((await res.json()).error ?? "Failed"); return; }
    const { campaign } = await res.json();
    router.push(`/campaigns/${campaign.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Input name="name" placeholder="Campaign name" required />
      <label className="block text-sm">ICP
        <select name="icpId" className="mt-1 h-9 w-full rounded-md border bg-transparent px-2 text-sm" style={{ borderColor: "var(--border)" }}>
          <option value="">— all / none —</option>
          {icps.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </label>
      <label className="block text-sm">Sender identity
        <select name="senderIdentityId" className="mt-1 h-9 w-full rounded-md border bg-transparent px-2 text-sm" style={{ borderColor: "var(--border)" }}>
          <option value="">— configure in Settings —</option>
          {senderIdentities.map((s) => <option key={s.id} value={s.id}>{s.fromName} ({s.fromEmail})</option>)}
        </select>
      </label>
      <div className="flex gap-3">
        <label className="flex-1 text-sm">Daily limit
          <Input name="dailyLimit" type="number" min={1} max={50} defaultValue={20} />
        </label>
        <label className="flex-1 text-sm">Min score
          <Input name="minScore" type="number" min={0} max={100} defaultValue={80} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="autoSend" />
        Auto-send without approval (only after domain warmup)
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create campaign"}</Button>
    </form>
  );
}

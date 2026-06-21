"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/i18n-provider";

interface Props {
  campaign: { id: string; name: string; dailyLimit: number; minScore: number; autoSend: boolean };
}

export function CampaignEditForm({ campaign }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/campaigns/${campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        dailyLimit: Number(fd.get("dailyLimit")),
        minScore: Number(fd.get("minScore")),
        autoSend: fd.get("autoSend") === "on",
      }),
    });
    setLoading(false);
    if (res.ok) { setOpen(false); router.refresh(); }
    else alert((await res.json()).error ?? "Failed");
  }

  if (!open) {
    return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>{t.common.edit}</Button>;
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-2 rounded-md border p-3" style={{ borderColor: "var(--border)" }}>
      <Input name="name" defaultValue={campaign.name} required />
      <div className="flex gap-3">
        <label className="flex-1 text-sm">{t.campaignForm.dailyLimit}
          <Input name="dailyLimit" type="number" min={1} max={50} defaultValue={campaign.dailyLimit} />
        </label>
        <label className="flex-1 text-sm">{t.campaignForm.minScore}
          <Input name="minScore" type="number" min={0} max={100} defaultValue={campaign.minScore} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="autoSend" defaultChecked={campaign.autoSend} />
        {t.campaignForm.autoSend}
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>{loading ? t.common.saving : t.common.saveChanges}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>{t.common.cancel}</Button>
      </div>
    </form>
  );
}

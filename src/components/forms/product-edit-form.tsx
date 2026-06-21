"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/components/i18n-provider";

interface Props {
  product: { id: string; name: string; url: string; affiliateUrl: string | null; description: string; notes: string | null };
}

export function ProductEditForm({ product }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        url: fd.get("url"),
        affiliateUrl: fd.get("affiliateUrl") || "",
        description: fd.get("description"),
        notes: fd.get("notes") || undefined,
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
    <form onSubmit={onSubmit} className="mt-3 space-y-2">
      <Input name="name" defaultValue={product.name} required />
      <Input name="url" type="url" defaultValue={product.url} required />
      <Input name="affiliateUrl" type="url" defaultValue={product.affiliateUrl ?? ""} placeholder={t.products.affiliate} />
      <Textarea name="description" defaultValue={product.description} required />
      <Textarea name="notes" defaultValue={product.notes ?? ""} placeholder={t.products.notes} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>{loading ? t.common.saving : t.common.saveChanges}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>{t.common.cancel}</Button>
      </div>
    </form>
  );
}

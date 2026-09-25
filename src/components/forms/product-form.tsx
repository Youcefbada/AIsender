"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/components/i18n-provider";

export function ProductForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/products", {
      method: "POST",
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
    if (!res.ok) {
      setError((await res.json()).error ?? "Failed");
      return;
    }
    const { product } = await res.json();
    router.push(`/products/${product.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Input name="name" placeholder={t.products.name} aria-label={t.products.name} required />
      <Input name="url" type="url" placeholder={t.products.url} aria-label={t.products.url} required />
      <Input name="affiliateUrl" type="url" placeholder={t.products.affiliate} aria-label={t.products.affiliate} />
      <Textarea name="description" placeholder={t.products.description} aria-label={t.products.description} required />
      <Textarea name="notes" placeholder={t.products.notes} aria-label={t.products.notes} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? t.products.creating : t.products.create}
      </Button>
    </form>
  );
}

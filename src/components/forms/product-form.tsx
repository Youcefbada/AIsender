"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ProductForm() {
  const router = useRouter();
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
      <Input name="name" placeholder="Product name" required />
      <Input name="url" type="url" placeholder="https://product-url.com" required />
      <Input name="affiliateUrl" type="url" placeholder="Affiliate URL (optional)" />
      <Textarea name="description" placeholder="What does it do? Who is it for?" required />
      <Textarea name="notes" placeholder="Optional notes" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create product"}
      </Button>
    </form>
  );
}

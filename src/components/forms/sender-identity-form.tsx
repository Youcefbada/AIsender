"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SenderIdentityForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/sender-identities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromName: fd.get("fromName"),
        fromEmail: fd.get("fromEmail"),
        replyTo: fd.get("replyTo") || undefined,
        channel: fd.get("channel"),
        mailingAddress: fd.get("mailingAddress"),
      }),
    });
    setLoading(false);
    if (!res.ok) { setError((await res.json()).error ?? "Failed"); return; }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Input name="fromName" placeholder="From name" required />
      <Input name="fromEmail" type="email" placeholder="you@verified-domain.com" required />
      <Input name="replyTo" type="email" placeholder="Reply-to (optional)" />
      <label className="block text-sm">Channel
        <select name="channel" className="mt-1 h-9 w-full rounded-md border bg-transparent px-2 text-sm" style={{ borderColor: "var(--border)" }}>
          <option value="RESEND">Resend</option>
          <option value="SMTP">SMTP</option>
        </select>
      </label>
      <Input name="mailingAddress" placeholder="Physical mailing address (required by law)" required />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Add sender identity"}</Button>
    </form>
  );
}

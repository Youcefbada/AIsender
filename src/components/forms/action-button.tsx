"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "@/components/ui/button";

interface Props extends ButtonProps {
  endpoint: string;
  body?: unknown;
  idle: string;
  busy?: string;
  confirm?: string;
}

// Generic POST-then-refresh button for one-shot mutations (analyze, run,
// approve, cancel). Keeps server components free of client logic.
export function ActionButton({ endpoint, body, idle, busy = "Working…", confirm, ...rest }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function go() {
    if (confirm && !window.confirm(confirm)) return;
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "Request failed");
      }
    } finally {
      setLoading(false);
      router.refresh();
    }
  }

  return (
    <Button onClick={go} disabled={loading} {...rest}>
      {loading ? busy : idle}
    </Button>
  );
}

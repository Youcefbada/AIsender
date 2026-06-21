"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "@/components/ui/button";

interface Props extends ButtonProps {
  endpoint: string;
  method?: "POST" | "DELETE" | "PATCH";
  body?: unknown;
  idle: string;
  busy?: string;
  confirm?: string;
  redirectTo?: string; // navigate here on success (e.g. after delete)
}

// Generic mutate-then-refresh button for one-shot actions (analyze, run,
// approve, cancel, delete). Keeps server components free of client logic.
export function ActionButton({ endpoint, method = "POST", body, idle, busy = "Working…", confirm, redirectTo, ...rest }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function go() {
    if (confirm && !window.confirm(confirm)) return;
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.ok && redirectTo) {
        router.push(redirectTo);
        return;
      }
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

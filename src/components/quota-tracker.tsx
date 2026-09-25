"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

interface UsageData {
  today: {
    discovery: { used: number; limit: number };
    emails: { used: number; limit: number };
  };
  providers: {
    gemini: boolean;
    groq: boolean;
    serper: boolean;
    reddit: boolean;
    resend: boolean;
    hunter: boolean;
  };
}

export function QuotaTracker() {
  const [data, setData] = useState<UsageData | null>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d) setData(d);
      })
      .catch(() => {});
  }, []);

  if (!data) return null;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4 text-sm"
      style={{
        borderColor: "var(--border)",
        background: "var(--card)",
      }}
    >
      <div className="flex flex-wrap items-center gap-6">
        <div>
          <span className="text-xs text-[var(--muted-foreground)]">Discovery Today: </span>
          <span className="font-semibold">
            {data.today.discovery.used} / {data.today.discovery.limit}
          </span>
          <span className="text-xs text-[var(--muted-foreground)]"> opportunities</span>
        </div>

        <div>
          <span className="text-xs text-[var(--muted-foreground)]">Outreach Today: </span>
          <span className="font-semibold">
            {data.today.emails.used} / {data.today.emails.limit}
          </span>
          <span className="text-xs text-[var(--muted-foreground)]"> emails (human-approved)</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-[var(--muted-foreground)]">Providers:</span>
        <Badge tone={data.providers.reddit ? "green" : "neutral"}>
          Reddit {data.providers.reddit ? "✓" : "○"}
        </Badge>
        <Badge tone={data.providers.serper ? "green" : "neutral"}>
          Serper {data.providers.serper ? "✓" : "○"}
        </Badge>
        <Badge tone={data.providers.gemini ? "green" : "neutral"}>
          Gemini {data.providers.gemini ? "✓" : "○"}
        </Badge>
        <Badge tone={data.providers.groq ? "green" : "neutral"}>
          Groq {data.providers.groq ? "✓" : "○"}
        </Badge>
        <Badge tone={data.providers.resend ? "green" : "neutral"}>
          Resend {data.providers.resend ? "✓" : "○"}
        </Badge>
        {data.providers.hunter && <Badge tone="blue">Hunter ✓</Badge>}
      </div>
    </div>
  );
}

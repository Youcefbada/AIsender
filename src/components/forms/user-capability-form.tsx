"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function UserCapabilityForm() {
  const [skills, setSkills] = useState("Next.js, React, Node.js, Python, AI Agents, Automation, PostgreSQL, Shopify");
  const [services, setServices] = useState("Custom SaaS, AI Automation, Internal Business Software, AI Agents, API Integrations");
  const [bio, setBio] = useState("");
  const [hourlyRateMin, setHourlyRateMin] = useState<string>("50");
  const [hourlyRateMax, setHourlyRateMax] = useState<string>("150");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/user-capabilities")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.capability) {
          const c = data.capability;
          if (Array.isArray(c.skills)) setSkills(c.skills.join(", "));
          if (Array.isArray(c.services)) setServices(c.services.join(", "));
          if (c.bio) setBio(c.bio);
          if (c.hourlyRateMin) setHourlyRateMin(String(c.hourlyRateMin));
          if (c.hourlyRateMax) setHourlyRateMax(String(c.hourlyRateMax));
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/user-capabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
          services: services.split(",").map((s) => s.trim()).filter(Boolean),
          bio: bio || undefined,
          hourlyRateMin: hourlyRateMin ? parseInt(hourlyRateMin, 10) : undefined,
          hourlyRateMax: hourlyRateMax ? parseInt(hourlyRateMax, 10) : undefined,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-semibold">Your Developer / Agency Skills (comma-separated)</label>
        <Input
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
          placeholder="e.g. Next.js, Python, AI, Shopify, PostgreSQL"
          className="mt-1"
          required
        />
        <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
          The Opportunity Scout uses your skills to calculate the Capability Match Score for each discovered post.
        </p>
      </div>

      <div>
        <label className="text-xs font-semibold">Offered Software & AI Services (comma-separated)</label>
        <Input
          value={services}
          onChange={(e) => setServices(e.target.value)}
          placeholder="e.g. Custom SaaS, AI Automation, Internal Business Software, AI Agents"
          className="mt-1"
          required
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold">Typical Min Hourly Rate ($)</label>
          <Input
            type="number"
            value={hourlyRateMin}
            onChange={(e) => setHourlyRateMin(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-semibold">Typical Max Hourly Rate ($)</label>
          <Input
            type="number"
            value={hourlyRateMax}
            onChange={(e) => setHourlyRateMax(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold">Brief Bio / Credentials (Optional)</label>
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="e.g. Senior Full-stack and AI developer with 7 years of building production SaaS and Shopify apps."
          rows={2}
          className="mt-1"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Developer Capabilities"}
        </Button>
        {saved && <span className="text-xs text-green-600 font-medium">✓ Capabilities updated!</span>}
      </div>
    </form>
  );
}

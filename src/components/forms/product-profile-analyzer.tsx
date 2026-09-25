"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProductProfileIntelligence } from "@/services/product-profile";

export function ProductProfileAnalyzer() {
  const router = useRouter();
  const [offer, setOffer] = useState("I build AI customer support agents for Shopify stores.");
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [geo, setGeo] = useState("");
  const [skills, setSkills] = useState("AI, Python, Next.js, Shopify, Automation");

  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [intelligence, setIntelligence] = useState<ProductProfileIntelligence | null>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!offer.trim()) return;
    setAnalyzing(true);
    setError(null);

    try {
      const res = await fetch("/api/product-profiles/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offer,
          name: name || undefined,
          websiteUrl: websiteUrl || undefined,
          targetAudience: targetAudience || undefined,
          geo: geo || undefined,
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Analysis failed");
      }

      const { intelligence: result } = await res.json();
      setIntelligence(result);
      if (!name) setName(result.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze offer");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSave() {
    if (!intelligence) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/product-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...intelligence,
          name: intelligence.name || name || "My Service",
          offer,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save profile");
      }

      router.push("/opportunities");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Offer Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Offer & Demand Intelligence Analyzer</CardTitle>
          <p className="text-xs text-[var(--muted-foreground)]">
            Tell us what you build or sell. The AI analyzes your offer, derives ICPs, pain points, demand signals, and creates Reddit & Google search strategies.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label className="text-xs font-semibold">Your Core Offer or Service *</label>
              <Textarea
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                placeholder="e.g. I build AI customer support agents for Shopify stores."
                rows={3}
                required
                className="mt-1"
              />
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                Be specific about who you help and what outcome you deliver.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold">Service / Product Name (Optional)</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Shopify AI Support Agent"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold">Website / Portfolio URL (Optional)</label>
                <Input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold">Target Audience (Optional)</label>
                <Input
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. E-commerce founders"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold">Target Geography</label>
                <Input
                  value={geo}
                  onChange={(e) => setGeo(e.target.value)}
                  placeholder="e.g. US, UK, Global"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold">Skills / Tech Stack</label>
                <Input
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. Next.js, Python, AI"
                  className="mt-1"
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

            <Button type="submit" disabled={analyzing || !offer.trim()}>
              {analyzing ? "🧠 Analyzing Offer with AI..." : "🚀 Analyze Offer & Derive Demand Strategy"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Generated Intelligence Review (Editable) */}
      {intelligence && (
        <Card className="border-orange-500/30">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <span>✨ Product & Demand Intelligence Profile</span>
                <Badge tone="green">Ready for Review</Badge>
              </CardTitle>
              <p className="text-xs text-[var(--muted-foreground)]">
                Review and customize the AI-generated strategy before saving.
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "💾 Save & Start Scouting Demand"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold">Profile Name</label>
                <Input
                  value={intelligence.name}
                  onChange={(e) => setIntelligence({ ...intelligence, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Category</label>
                <Input
                  value={intelligence.category || ""}
                  onChange={(e) => setIntelligence({ ...intelligence, category: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold">Value Proposition / Description</label>
              <Textarea
                value={intelligence.description}
                onChange={(e) => setIntelligence({ ...intelligence, description: e.target.value })}
                rows={2}
                className="mt-1"
              />
            </div>

            {/* Pain Points & Problems Solved */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border p-3" style={{ borderColor: "var(--border)" }}>
                <h4 className="text-xs font-semibold">Problems Solved</h4>
                <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-[var(--muted-foreground)]">
                  {intelligence.problemsSolved.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-md border p-3" style={{ borderColor: "var(--border)" }}>
                <h4 className="text-xs font-semibold">Customer Pain Points</h4>
                <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-[var(--muted-foreground)]">
                  {intelligence.painPoints.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Demand Signals */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-md border p-3 border-green-500/20">
                <h4 className="text-xs font-semibold text-green-600 dark:text-green-400">
                  🔥 Strong Demand Signals
                </h4>
                <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-[var(--muted-foreground)]">
                  {intelligence.strongDemandSignals.map((s, i) => (
                    <li key={i}>"{s}"</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-md border p-3 border-amber-500/20">
                <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  ⚡ Medium Demand Signals
                </h4>
                <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-[var(--muted-foreground)]">
                  {intelligence.mediumDemandSignals.map((s, i) => (
                    <li key={i}>"{s}"</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-md border p-3 border-red-500/20">
                <h4 className="text-xs font-semibold text-red-600 dark:text-red-400">
                  ⛔ Negative / Disqualifying Signals
                </h4>
                <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-[var(--muted-foreground)]">
                  {intelligence.negativeSignals.map((s, i) => (
                    <li key={i}>"{s}"</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Communities & Generated Queries */}
            <div className="space-y-3 rounded-md bg-[var(--muted)] p-4 text-xs">
              <h4 className="font-semibold text-sm">Targeted Search Strategy</h4>

              <div>
                <span className="font-medium">Recommended Subreddits:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {intelligence.recommendedCommunities.map((c, i) => (
                    <Badge key={i} tone="amber">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-medium">Reddit Search Queries:</span>
                <ul className="mt-1 list-disc list-inside space-y-0.5 text-[var(--muted-foreground)]">
                  {intelligence.generatedSearchQueries.reddit?.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="font-medium">Web & X Search Queries:</span>
                <ul className="mt-1 list-disc list-inside space-y-0.5 text-[var(--muted-foreground)]">
                  {intelligence.generatedSearchQueries.web?.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                  {intelligence.generatedSearchQueries.x?.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving Profile..." : "💾 Save & Open Opportunities Scout"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

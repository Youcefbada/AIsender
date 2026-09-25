"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export interface OpportunityItem {
  id: string;
  sourceUrl: string;
  platform: "REDDIT" | "X" | "WEB" | "FORUM";
  authorName?: string | null;
  authorUsername?: string | null;
  authorProfileUrl?: string | null;
  companyName?: string | null;
  companyDomain?: string | null;
  publishedAt?: string | null;
  discoveredAt: string;
  originalText: string;
  detectedNeed?: string | null;
  detectedProblem?: string | null;
  opportunityType: string;
  intentLevel: string;
  intentScore: number;
  commercialScore: number;
  capabilityMatchScore: number;
  recencyScore: number;
  confidenceScore: number;
  overallScore: number;
  evidence?: string[] | null;
  whyThisIsAnOpportunity?: string | null;
  recommendedOffer?: string | null;
  recommendedApproach?: string | null;
  suggestedMessage?: string | null;
  status: "NEW" | "SAVED" | "CONTACTED" | "IGNORED" | "CONVERTED";
  email?: string | null;
  emailConfidence?: "NONE" | "GUESSED" | "ROLE_BASED" | "VERIFIED";
  contactUrl?: string | null;
  productProfile?: {
    id: string;
    name: string;
  };
}

interface OpportunityListProps {
  initialOpportunities: OpportunityItem[];
  profiles: { id: string; name: string }[];
}

export function OpportunityList({ initialOpportunities, profiles }: OpportunityListProps) {
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>(initialOpportunities);
  const [activeTab, setActiveTab] = useState<string>("NEW");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("ALL");
  const [selectedProfile, setSelectedProfile] = useState<string>("ALL");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [messageModal, setMessageModal] = useState<{ id: string; text: string; subject: string } | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [scoutingProfileId, setScoutingProfileId] = useState<string>(profiles[0]?.id || "");
  const [scoutMsg, setScoutMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Status Tabs
  const tabs = [
    { key: "NEW", label: "New Opportunities" },
    { key: "HIGH_INTENT", label: "🔥 High Intent (80+)" },
    { key: "SAVED", label: "Saved" },
    { key: "CONTACTED", label: "Contacted" },
    { key: "IGNORED", label: "Ignored" },
    { key: "ALL", label: "All Discovered" },
  ];

  // Filtering logic
  const filtered = opportunities.filter((item) => {
    if (activeTab === "HIGH_INTENT") {
      if (item.overallScore < 80) return false;
      if (item.status === "IGNORED") return false;
    } else if (activeTab !== "ALL" && item.status !== activeTab) {
      return false;
    }

    if (selectedPlatform !== "ALL" && item.platform !== selectedPlatform) {
      return false;
    }

    if (selectedProfile !== "ALL" && item.productProfile?.id !== selectedProfile) {
      return false;
    }

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const match =
        item.detectedNeed?.toLowerCase().includes(q) ||
        item.detectedProblem?.toLowerCase().includes(q) ||
        item.originalText.toLowerCase().includes(q) ||
        item.authorName?.toLowerCase().includes(q) ||
        item.companyName?.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Actions
  async function updateStatus(id: string, status: OpportunityItem["status"]) {
    setBusyAction(`status-${id}`);
    try {
      const res = await fetch("/api/opportunities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setOpportunities((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status } : o)),
        );
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleFindContact(id: string) {
    setBusyAction(`contact-${id}`);
    try {
      const res = await fetch(`/api/opportunities/${id}/contact`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setOpportunities((prev) =>
          prev.map((o) =>
            o.id === id
              ? {
                  ...o,
                  email: data.contact?.email || o.email,
                  emailConfidence: data.contact?.confidence || o.emailConfidence,
                  contactUrl: data.contact?.contactUrl || o.contactUrl,
                }
              : o,
          ),
        );
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleGenerateMessage(id: string) {
    setBusyAction(`message-${id}`);
    try {
      const res = await fetch(`/api/opportunities/${id}/message`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setMessageModal({
          id,
          subject: data.message.subject,
          text: data.message.messageText,
        });
        setOpportunities((prev) =>
          prev.map((o) =>
            o.id === id
              ? {
                  ...o,
                  suggestedMessage: `${data.message.subject}\n\n${data.message.messageText}`,
                }
              : o,
          ),
        );
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function triggerScout() {
    if (!scoutingProfileId) return;
    setBusyAction("scout");
    setScoutMsg("Scouting Reddit and Web for demand signals...");
    try {
      const res = await fetch("/api/opportunities/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: scoutingProfileId }),
      });
      if (res.ok) {
        const data = await res.json();
        setScoutMsg(
          `Scout complete! Discovered: ${data.stats.rawDiscovered}, Qualified & Saved: ${data.stats.saved} (${data.stats.highIntentCount} high-intent)`,
        );
        // Refresh opportunities
        const listRes = await fetch("/api/opportunities");
        if (listRes.ok) {
          const listData = await listRes.json();
          setOpportunities(listData.opportunities);
        }
      } else {
        const err = await res.json();
        setScoutMsg(`Notice: ${err.error}`);
      }
    } catch {
      setScoutMsg("Scout request failed");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Scout Execution Bar */}
      <Card style={{ borderColor: "var(--border)" }}>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Scout Offer:</span>
            {profiles.length > 0 ? (
              <select
                value={scoutingProfileId}
                onChange={(e) => setScoutingProfileId(e.target.value)}
                className="rounded-md border bg-[var(--background)] px-3 py-1.5 text-sm"
                style={{ borderColor: "var(--border)" }}
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-[var(--muted-foreground)]">
                No product profile yet. Create one in /products first.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={triggerScout}
              disabled={busyAction === "scout" || profiles.length === 0}
            >
              {busyAction === "scout" ? "Scouting the web..." : "⚡ Run Opportunity Scout"}
            </Button>
          </div>
        </CardContent>
        {scoutMsg && (
          <div className="border-t px-4 py-2 text-xs text-[var(--muted-foreground)]" style={{ borderColor: "var(--border)" }}>
            {scoutMsg}
          </div>
        )}
      </Card>

      {/* Tabs & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1 border-b pb-2" style={{ borderColor: "var(--border)" }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-[var(--foreground)] text-[var(--background)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="rounded-md border bg-[var(--background)] px-2.5 py-1 text-xs"
            style={{ borderColor: "var(--border)" }}
          >
            <option value="ALL">All Platforms</option>
            <option value="REDDIT">Reddit</option>
            <option value="X">X (Twitter)</option>
            <option value="WEB">Web</option>
            <option value="FORUM">Forums</option>
          </select>

          <Input
            aria-label="Search opportunities"
            placeholder="Search keywords / author..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="h-8 w-48 text-xs"
          />
        </div>
      </div>

      {/* Opportunities Feed */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-[var(--muted-foreground)]">
              No opportunities found in this view. Run the scout above or adjust filters!
            </CardContent>
          </Card>
        ) : (
          filtered.map((opp) => (
            <Card
              key={opp.id}
              className="transition-shadow hover:shadow-sm"
              style={{
                borderColor: opp.overallScore >= 80 ? "rgba(234, 88, 12, 0.4)" : "var(--border)",
              }}
            >
              <CardContent className="space-y-3 p-5">
                {/* Header: Platform, Author, Score */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3" style={{ borderColor: "var(--border)" }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={opp.platform === "REDDIT" ? "amber" : opp.platform === "X" ? "blue" : "neutral"}>
                      {opp.platform}
                    </Badge>
                    <Badge tone="default">{opp.opportunityType.replace(/_/g, " ")}</Badge>
                    {opp.authorUsername && (
                      <span className="text-xs font-medium">@{opp.authorUsername}</span>
                    )}
                    {opp.companyName && (
                      <span className="text-xs text-[var(--muted-foreground)]">· {opp.companyName}</span>
                    )}
                    {opp.publishedAt && (
                      <span className="text-xs text-[var(--muted-foreground)]">
                        · {new Date(opp.publishedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge tone={opp.overallScore >= 80 ? "amber" : opp.overallScore >= 60 ? "blue" : "neutral"}>
                      {opp.overallScore >= 80 ? "🔥 " : ""}Score: {opp.overallScore}/100
                    </Badge>
                    <Badge tone={opp.status === "SAVED" ? "green" : opp.status === "CONTACTED" ? "blue" : "neutral"}>
                      {opp.status}
                    </Badge>
                  </div>
                </div>

                {/* Detected Need & Pain */}
                <div>
                  <h3 className="font-semibold text-base">{opp.detectedNeed || opp.originalText.slice(0, 100)}</h3>
                  {opp.detectedProblem && (
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      <span className="font-medium text-[var(--foreground)]">Pain point:</span> {opp.detectedProblem}
                    </p>
                  )}
                </div>

                {/* Why This Is An Opportunity & Evidence */}
                <div className="rounded-md bg-[var(--muted)] p-3 text-xs space-y-2">
                  <div>
                    <span className="font-semibold text-[var(--foreground)]">Why this is an opportunity: </span>
                    <span className="text-[var(--muted-foreground)]">{opp.whyThisIsAnOpportunity}</span>
                  </div>

                  {opp.evidence && opp.evidence.length > 0 && (
                    <div>
                      <span className="font-semibold text-[var(--foreground)]">Evidence from source:</span>
                      <ul className="mt-1 list-disc list-inside space-y-0.5 text-[var(--muted-foreground)] italic">
                        {opp.evidence.map((ev, i) => (
                          <li key={i}>"{ev}"</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {opp.recommendedOffer && (
                    <div>
                      <span className="font-semibold text-[var(--foreground)]">Recommended offer: </span>
                      <span className="text-[var(--foreground)]">{opp.recommendedOffer}</span>
                    </div>
                  )}
                </div>

                {/* Score Breakdown Pills */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  <span>Intent: <b className="text-[var(--foreground)]">{opp.intentScore}/30</b></span>
                  <span>· Commercial: <b className="text-[var(--foreground)]">{opp.commercialScore}/25</b></span>
                  <span>· Fit: <b className="text-[var(--foreground)]">{opp.capabilityMatchScore}/25</b></span>
                  <span>· Recency: <b className="text-[var(--foreground)]">{opp.recencyScore}/10</b></span>
                  <span>· Confidence: <b className="text-[var(--foreground)]">{opp.confidenceScore}/10</b></span>
                </div>

                {/* Contact information if found */}
                {opp.email && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium">Direct Contact:</span>
                    <code className="rounded bg-[var(--muted)] px-1.5 py-0.5">{opp.email}</code>
                    <Badge tone={opp.emailConfidence === "VERIFIED" ? "green" : "amber"}>
                      {opp.emailConfidence}
                    </Badge>
                  </div>
                )}

                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Genuine Real URL */}
                    <a
                      href={opp.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-[var(--muted)]"
                      style={{ borderColor: "var(--border)" }}
                    >
                      ↗ Open Original Source
                    </a>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateMessage(opp.id)}
                      disabled={busyAction === `message-${opp.id}`}
                    >
                      {busyAction === `message-${opp.id}` ? "Drafting..." : "✍ Generate Message"}
                    </Button>

                    {!opp.email && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFindContact(opp.id)}
                        disabled={busyAction === `contact-${opp.id}`}
                      >
                        {busyAction === `contact-${opp.id}` ? "Searching..." : "🔍 Find Contact"}
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {opp.status !== "SAVED" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateStatus(opp.id, "SAVED")}
                        disabled={busyAction === `status-${opp.id}`}
                      >
                        Save
                      </Button>
                    )}

                    {opp.status !== "CONTACTED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus(opp.id, "CONTACTED")}
                        disabled={busyAction === `status-${opp.id}`}
                      >
                        Mark Contacted
                      </Button>
                    )}

                    {opp.status !== "IGNORED" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateStatus(opp.id, "IGNORED")}
                        disabled={busyAction === `status-${opp.id}`}
                      >
                        Ignore
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Suggested Message Modal */}
      {messageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <Card className="w-full max-w-xl space-y-4 p-6 bg-[var(--background)]">
            <CardHeader className="p-0">
              <CardTitle id="modal-title" className="text-base font-semibold">Suggested Outreach Message</CardTitle>
              <p className="text-xs text-[var(--muted-foreground)]">
                Review and edit before sending. Human-in-the-loop outreach ensures authenticity.
              </p>
            </CardHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[var(--muted-foreground)]">Subject / Opening</label>
                <Input
                  value={messageModal.subject}
                  onChange={(e) => setMessageModal({ ...messageModal, subject: e.target.value })}
                  className="mt-1 text-sm font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--muted-foreground)]">Message Body</label>
                <textarea
                  value={messageModal.text}
                  onChange={(e) => setMessageModal({ ...messageModal, text: e.target.value })}
                  rows={6}
                  className="mt-1 w-full rounded-md border p-2 text-sm bg-[var(--background)]"
                  style={{ borderColor: "var(--border)" }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${messageModal.subject}\n\n${messageModal.text}`);
                  alert("Copied to clipboard!");
                }}
              >
                Copy to Clipboard
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setMessageModal(null)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    updateStatus(messageModal.id, "CONTACTED");
                    setMessageModal(null);
                  }}
                >
                  Mark as Sent
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

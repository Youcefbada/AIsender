import { prisma } from "@/lib/db";
import type { Contact } from "@prisma/client";
import { getProvider } from "@/lib/discovery/provider";
import { serperProvider } from "@/lib/discovery/serper";
import { findContacts } from "@/lib/contact/find";
import { validateEmail } from "@/lib/email/validate";
import { normalizeDomain } from "@/lib/utils";
import { consumeQuota } from "@/lib/ratelimit";
import { getUserProviderKeys, getUserSecret } from "@/lib/keys";
import { scoreLead } from "@/services/score-lead";
import { researchProspect } from "@/services/research-prospect";
import { generateEmail } from "@/services/generate-email";

// AI AGENT MODE pipeline. Per campaign, nightly. Does everything up to sending;
// drafts land as PENDING_APPROVAL unless campaign.autoSend.
//
// Stage order is cost-aware: cheap filters first, the expensive LLM draft last,
// each stage gated by the previous so we never research/draft a bad lead.
// Every lead is wrapped in try/catch — one failure never aborts the batch.

export interface RunStats {
  discovered: number;
  scored: number;
  qualified: number;
  contactsFound: number;
  researched: number;
  drafted: number;
}

export interface PipelineOptions {
  // Max leads to fully process (score→draft) in this invocation. Keeps a single
  // cron-triggered HTTP call well under shared-hosting (Passenger) timeouts; the
  // pipeline is idempotent (status machine) so repeated ticks drain the backlog.
  maxLeads?: number;
}

export async function runCampaignPipeline(
  campaignId: string,
  opts: PipelineOptions = {},
): Promise<RunStats> {
  const maxLeads = opts.maxLeads ?? 10;
  const stats: RunStats = {
    discovered: 0,
    scored: 0,
    qualified: 0,
    contactsFound: 0,
    researched: 0,
    drafted: 0,
  };

  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: { product: { include: { analysis: true, icps: true } }, icp: true },
  });
  const analysis = campaign.product.analysis;
  if (!analysis) throw new Error("Product not analyzed yet");

  const analysisLike = {
    summary: analysis.summary,
    industries: (analysis.industries as string[]) ?? [],
    painPoints: (analysis.painPoints as string[]) ?? [],
  };

  // Per-user credentials (entered in Settings): AI provider keys + Serper key.
  const aiKeys = await getUserProviderKeys(campaign.userId);
  const serperKey = await getUserSecret(campaign.userId, "SERPER");

  // ── 1. DISCOVER (only top up when the backlog is low, so a tick does either
  //     discovery OR processing-heavy work, never an unbounded amount of both) ──
  const backlog = await prisma.lead.count({
    where: { campaignId: campaign.id, status: "DISCOVERED" },
  });
  // Prefer the user's own Serper key when set, else the system default provider.
  const provider = serperKey ? serperProvider : getProvider();
  // Use the campaign's ICP queries; if no ICP was selected, fall back to ALL of
  // the product's ICP search queries so discovery still works.
  const queries: string[] = (campaign.icp?.searchQueries as string[] | undefined)?.length
    ? (campaign.icp!.searchQueries as string[])
    : [
        ...new Set(
          campaign.product.icps.flatMap((i) => (i.searchQueries as string[] | null) ?? []),
        ),
      ];
  const discovered = queries.length && backlog < maxLeads
    ? await provider.search({
        queries,
        industry: campaign.icp?.industry ?? undefined,
        geo: campaign.icp?.geo ?? undefined,
        limit: campaign.dailyLimit * 4,
        apiKey: serperKey ?? undefined,
      })
    : [];

  for (const d of discovered) {
    const domain = normalizeDomain(d.website ?? "");
    try {
      // dedup on (userId, domain) when we have a domain
      if (domain) {
        const existing = await prisma.lead.findUnique({
          where: { userId_domain: { userId: campaign.userId, domain } },
        });
        if (existing) continue;
      }
      await prisma.lead.create({
        data: {
          userId: campaign.userId,
          campaignId: campaign.id,
          icpId: campaign.icpId,
          company: d.company,
          website: d.website,
          domain,
          industry: d.industry,
          companySize: d.companySize,
          geo: d.geo,
          source: d.source,
          sourceUrl: d.sourceUrl,
        },
      });
      stats.discovered++;
    } catch (err) {
      console.error("discover persist error:", d.company, err);
    }
  }

  // ── Process a bounded slice of the funnel for this campaign ───────────────
  const leads = await prisma.lead.findMany({
    where: { campaignId: campaign.id, status: { in: ["DISCOVERED", "QUALIFIED", "CONTACT_FOUND", "RESEARCHED"] } },
    orderBy: { createdAt: "asc" },
    take: maxLeads,
  });

  for (const lead of leads) {
    try {
      // ── RESEARCH FIRST (best effort) so scoring sees real website content ──
      if (lead.status === "DISCOVERED") {
        const r = await researchProspect(lead.id, aiKeys);
        if (r) stats.researched++;
      }

      // ── SCORE + QUALIFY (uses the research we just gathered) ───────────────
      let qualified = lead.status === "QUALIFIED" || lead.status === "CONTACT_FOUND";
      if (lead.status === "DISCOVERED" || lead.status === "RESEARCHED") {
        const res = await scoreLead(lead.id, analysisLike, campaign.minScore, aiKeys);
        stats.scored++;
        qualified = res.qualified;
      }
      if (!qualified) continue;
      stats.qualified++;

      // ── 4. CONTACT DISCOVERY + VALIDATION ─────────────────────────────────
      let contact: Contact | null = await prisma.contact.findFirst({
        where: { leadId: lead.id, email: { not: null }, emailStatus: { not: "INVALID" } },
      });
      if (!contact && lead.website) {
        const created: Contact[] = [];
        for (const f of await findContacts(lead.website)) {
          const verdict = await validateEmail(f.email);
          if (verdict.verdict === "INVALID") continue;
          created.push(
            await prisma.contact.create({
              data: {
                leadId: lead.id,
                email: f.email,
                source: f.source,
                emailStatus: verdict.verdict,
                isPrimary: created.length === 0,
              },
            }),
          );
        }
        contact = created[0] ?? null;
        if (contact) {
          await prisma.lead.update({ where: { id: lead.id }, data: { status: "CONTACT_FOUND" } });
        }
      }
      if (!contact?.email) continue;

      // suppression check
      const suppressed = await prisma.suppression.findUnique({
        where: { userId_email: { userId: campaign.userId, email: contact.email.toLowerCase() } },
      });
      if (suppressed) continue;
      stats.contactsFound++;

      // ── DRAFT (respect the daily email ceiling) ───────────────────────────
      const already = await prisma.emailMessage.findFirst({
        where: { leadId: lead.id, stepOrder: 0 },
      });
      if (already) continue;

      const quota = await consumeQuota(campaign.userId, "emails:day", 1);
      if (!quota.allowed) break; // out of budget today — stop drafting

      await generateEmail({
        campaignId: campaign.id,
        leadId: lead.id,
        contactId: contact.id,
        providerKeys: aiKeys,
      });
      stats.drafted++;
    } catch (err) {
      console.error("lead pipeline error:", lead.company, err);
      // continue — never let one lead abort the batch
    }
  }

  return stats;
}

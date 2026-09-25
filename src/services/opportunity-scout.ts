import { prisma } from "@/lib/db";
import { redditDiscoveryProvider } from "@/lib/discovery/reddit";
import { serperOpportunityProvider } from "@/lib/discovery/serper";
import {
  deterministicFilter,
  fastClassifyCandidate,
  deepScoreCandidate,
  type QualifiedOpportunityResult,
} from "./opportunity-classifier";
import { consumeQuota } from "@/lib/ratelimit";
import { getUserSecret } from "@/lib/keys";
import type { Prisma, OpportunityPlatform } from "@prisma/client";

export interface ScoutRunOptions {
  profileId: string;
  userId: string;
  maxToSave?: number; // target ~10-30 opportunities per run
}

export interface ScoutRunStats {
  rawDiscovered: number;
  deterministicAccepted: number;
  classifiedOpportunities: number;
  saved: number;
  highIntentCount: number;
  errors: string[];
}

export async function runOpportunityScout(
  opts: ScoutRunOptions,
): Promise<ScoutRunStats> {
  const stats: ScoutRunStats = {
    rawDiscovered: 0,
    deterministicAccepted: 0,
    classifiedOpportunities: 0,
    saved: 0,
    highIntentCount: 0,
    errors: [],
  };

  const maxToSave = opts.maxToSave ?? 30;

  // 1. Load ProductProfile & UserCapability
  const profile = await prisma.productProfile.findFirst({
    where: { id: opts.profileId, userId: opts.userId },
  });
  if (!profile) {
    throw new Error("Product profile not found");
  }

  const capability = await prisma.userCapability.findUnique({
    where: { userId: opts.userId },
  });

  // 2. Check Daily Opportunity Discovery Quota (Default 30/day)
  const quotaCheck = await consumeQuota(opts.userId, "discovery:day", 0);
  if (!quotaCheck.allowed) {
    stats.errors.push("Daily discovery limit reached (30 opportunities/day)");
    return stats;
  }

  // 3. Extract search queries and communities
  const queriesObj = (profile.generatedSearchQueries ?? {}) as {
    reddit?: string[];
    web?: string[];
    x?: string[];
    forums?: string[];
  };

  const redditQueries = queriesObj.reddit?.length
    ? queriesObj.reddit
    : [`${profile.name} looking for`, "need developer", "software alternative"];

  const webAndXQueries = [
    ...(queriesObj.web ?? []),
    ...(queriesObj.x ?? []),
  ].slice(0, 6);

  const communities = (profile.recommendedCommunities as string[]) ?? [];

  // Check user keys
  const serperKey = await getUserSecret(opts.userId, "SERPER");
  const redditKey = await getUserSecret(opts.userId, "REDDIT");

  // 4. Run Discovery Providers
  const rawItems: import("@/lib/discovery/opportunity-provider").DiscoveredRawItem[] = [];

  // Provider A: Reddit
  try {
    const redditResults = await redditDiscoveryProvider.search({
      queries: redditQueries,
      communities,
      apiKey: redditKey ?? undefined,
      limit: 25,
    });
    rawItems.push(...redditResults);
  } catch (err) {
    stats.errors.push(`Reddit provider notice: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Provider B: Serper (Web + X.com queries)
  if (serperKey || process.env.SERPER_API_KEY) {
    try {
      const serperResults = await serperOpportunityProvider.search({
        queries: webAndXQueries,
        apiKey: serperKey ?? undefined,
        limit: 20,
      });
      rawItems.push(...serperResults);
    } catch (err) {
      stats.errors.push(`Serper provider notice: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  stats.rawDiscovered = rawItems.length;

  // 5. Deduplication against already existing opportunities — checked in the DB
  // (batched) instead of loading every stored sourceUrl into memory.
  const negativeSignals = (profile.negativeSignals as string[]) ?? [];
  const qualified: QualifiedOpportunityResult[] = [];
  const seenThisRun = new Set<string>();

  // Stage 1 & 2 & 3 Pipeline
  for (const item of rawItems) {
    if (qualified.length >= maxToSave) break;
    if (seenThisRun.has(item.sourceUrl)) continue;
    seenThisRun.add(item.sourceUrl);

    // Dedup check against the database
    const alreadyExists = await prisma.opportunity.findFirst({
      where: { userId: opts.userId, sourceUrl: item.sourceUrl },
      select: { id: true },
    });
    if (alreadyExists) continue;

    // Stage 1: Deterministic filter
    const det = deterministicFilter(item, negativeSignals);
    if (!det.keep) continue;
    stats.deterministicAccepted++;

    // Stage 2: Fast classification
    try {
      const classification = await fastClassifyCandidate(
        item,
        {
          name: profile.name,
          offer: profile.offer,
          problemsSolved: profile.problemsSolved,
        },
        opts.userId,
      );

      if (!classification.isOpportunity || classification.opportunityType === "NOT_RELEVANT") {
        continue;
      }
      stats.classifiedOpportunities++;

      // Stage 3: Deep scoring & product match
      const scoring = await deepScoreCandidate(
        item,
        classification,
        {
          name: profile.name,
          description: profile.description,
          offer: profile.offer,
          problemsSolved: profile.problemsSolved,
          painPoints: profile.painPoints,
          strongDemandSignals: profile.strongDemandSignals,
          negativeSignals: profile.negativeSignals,
          technologies: profile.technologies,
        },
        capability,
        opts.userId,
      );

      qualified.push({
        raw: item,
        classification,
        scoring,
      });
    } catch (err) {
      console.warn("Opportunity pipeline item error:", err);
    }
  }

  // 6. Persist qualified opportunities into DB
  for (const q of qualified) {
    try {
      await prisma.opportunity.upsert({
        where: {
          userId_sourceUrl: {
            userId: opts.userId,
            sourceUrl: q.raw.sourceUrl,
          },
        },
        create: {
          userId: opts.userId,
          productProfileId: profile.id,
          source: q.raw.source,
          sourceUrl: q.raw.sourceUrl,
          sourceExternalId: q.raw.sourceExternalId,
          platform: q.raw.platform,
          authorName: q.raw.authorName,
          authorUsername: q.raw.authorUsername,
          authorProfileUrl: q.raw.authorProfileUrl,
          companyName: q.raw.companyName,
          companyDomain: q.raw.companyDomain,
          publishedAt: q.raw.publishedAt,
          originalText: q.raw.content,
          detectedNeed: q.classification.detectedNeed,
          detectedProblem: q.classification.detectedProblem,
          requestedSolution: q.classification.requestedSolution,
          opportunityType: q.classification.opportunityType,
          intentLevel: q.classification.intentLevel,
          intentScore: q.scoring.intentScore,
          commercialScore: q.scoring.commercialScore,
          capabilityMatchScore: q.scoring.capabilityMatchScore,
          recencyScore: q.scoring.recencyScore,
          confidenceScore: q.scoring.confidenceScore,
          overallScore: q.scoring.overallScore,
          evidence: q.scoring.evidence as unknown as Prisma.InputJsonValue,
          whyThisIsAnOpportunity: q.scoring.whyThisIsAnOpportunity,
          recommendedOffer: q.scoring.recommendedOffer,
          recommendedApproach: q.scoring.recommendedApproach,
          status: "NEW",
        },
        update: {
          overallScore: q.scoring.overallScore,
          intentScore: q.scoring.intentScore,
          commercialScore: q.scoring.commercialScore,
          capabilityMatchScore: q.scoring.capabilityMatchScore,
          evidence: q.scoring.evidence as unknown as Prisma.InputJsonValue,
          whyThisIsAnOpportunity: q.scoring.whyThisIsAnOpportunity,
          recommendedOffer: q.scoring.recommendedOffer,
          recommendedApproach: q.scoring.recommendedApproach,
        },
      });

      stats.saved++;
      if (q.scoring.overallScore >= 80) {
        stats.highIntentCount++;
      }
    } catch (saveErr) {
      console.warn("Failed saving opportunity:", saveErr);
    }
  }

  // 7. Record Search Run
  await prisma.searchRun.create({
    data: {
      userId: opts.userId,
      productProfileId: profile.id,
      provider: "scout_pipeline",
      query: profile.name,
      resultsFound: stats.rawDiscovered,
      resultsAccepted: stats.saved,
      quotaConsumed: stats.saved,
    },
  });

  // Consume daily opportunity discovery counter
  if (stats.saved > 0) {
    await consumeQuota(opts.userId, "discovery:day", stats.saved);
  }

  return stats;
}

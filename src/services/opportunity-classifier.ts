import { chatComplete } from "@/lib/ai/openrouter";
import { z } from "zod";
import {
  opportunityClassifierPrompt,
  opportunityScorerPrompt,
} from "@/lib/ai/prompts";
import { getUserProviderKeys } from "@/lib/keys";
import type { DiscoveredRawItem } from "@/lib/discovery/opportunity-provider";
import type {
  OpportunityPlatform,
  OpportunityType,
  IntentLevel,
} from "@prisma/client";

export interface CandidateClassification {
  isOpportunity: boolean;
  opportunityType: OpportunityType;
  intentLevel: IntentLevel;
  detectedNeed: string;
  detectedProblem: string;
  requestedSolution: string;
  initialRelevanceScore: number;
}

const classificationSchema = z.object({
  isOpportunity: z.boolean(),
  opportunityType: z.string(),
  intentLevel: z.string(),
  detectedNeed: z.string(),
  detectedProblem: z.string(),
  requestedSolution: z.string().optional(),
  initialRelevanceScore: z.number().optional(),
});

export interface DetailedScoringResult {
  intentScore: number; // 0-30
  commercialScore: number; // 0-25
  capabilityMatchScore: number; // 0-25
  recencyScore: number; // 0-10
  confidenceScore: number; // 0-10
  overallScore: number; // 0-100
  evidence: string[];
  whyThisIsAnOpportunity: string;
  recommendedOffer: string;
  recommendedApproach: string;
}

const scoringSchema = z.object({
  intentScore: z.number(),
  commercialScore: z.number(),
  capabilityMatchScore: z.number(),
  recencyScore: z.number(),
  confidenceScore: z.number(),
  overallScore: z.number().optional(),
  evidence: z.array(z.string()).default([]),
  whyThisIsAnOpportunity: z.string(),
  recommendedOffer: z.string(),
  recommendedApproach: z.string(),
});

export interface QualifiedOpportunityResult {
  raw: DiscoveredRawItem;
  classification: CandidateClassification;
  scoring: DetailedScoringResult;
}

// Prisma enum member names are UPPER_SNAKE_CASE; the LLM may return lowercase
// values like "custom_software", which would crash the Prisma write. Normalize
// and validate against the actual enum members.
const OPPORTUNITY_TYPES: OpportunityType[] = [
  "PAID_PROJECT",
  "CUSTOM_SOFTWARE",
  "SAAS_MVP",
  "AI_PROJECT",
  "AI_AUTOMATION",
  "INTERNAL_TOOL",
  "WEBSITE_PROJECT",
  "MOBILE_APP",
  "EXISTING_SOFTWARE_DEVELOPMENT",
  "BUG_FIX",
  "TECHNICAL_COFOUNDER",
  "EQUITY_PROJECT",
  "IDEA_ONLY",
  "JOB",
  "NOT_RELEVANT",
];

const INTENT_LEVELS: IntentLevel[] = ["EXPLICIT", "HIGH", "MEDIUM", "LOW", "NONE"];

function normalizeEnum<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  if (typeof value !== "string") return fallback;
  const upper = value.trim().toUpperCase().replace(/[\s-]/g, "_") as T;
  return allowed.includes(upper) ? upper : fallback;
}

// ─── STAGE 1: DETERMINISTIC FILTERING (Zero LLM cost) ────────────────────────
const SPAM_REGEX =
  /(crypto giveaway|free nitro|airdrop|casino|xxx|porn|escort|telegram channel|whatsapp group|dm for crypto)/i;

export function deterministicFilter(
  item: DiscoveredRawItem,
  negativeSignals: string[] = [],
): { keep: boolean; reason?: string } {
  const combined = `${item.title} ${item.content}`.toLowerCase();

  // 1. Length check: very short content lacks enough context to be qualified demand
  if (combined.length < 35) {
    return { keep: false, reason: "Too short / insufficient context" };
  }

  // 2. Spam filter
  if (SPAM_REGEX.test(combined)) {
    return { keep: false, reason: "Matches spam keywords" };
  }

  // 3. User-defined negative signals
  for (const sig of negativeSignals) {
    if (sig && sig.length > 2 && combined.includes(sig.toLowerCase())) {
      return { keep: false, reason: `Matches negative signal: ${sig}` };
    }
  }

  return { keep: true };
}

// ─── STAGE 2: FAST CLASSIFICATION (Fast / cheap model) ───────────────────────
export async function fastClassifyCandidate(
  item: DiscoveredRawItem,
  productProfile: {
    name: string;
    offer: string | null;
    problemsSolved: unknown;
  },
  userId: string,
): Promise<CandidateClassification> {
  const providerKeys = await getUserProviderKeys(userId);
  const problems = Array.isArray(productProfile.problemsSolved)
    ? (productProfile.problemsSolved as string[])
    : [];

  const res = await chatComplete({
    task: "scoring", // Uses cheap & fast model (Gemini Flash-Lite or Groq 8b)
    providerKeys,
    jsonMode: true,
    temperature: 0.2,
    schema: classificationSchema,
    messages: opportunityClassifierPrompt({
      productName: productProfile.name,
      offer: productProfile.offer || productProfile.name,
      problemsSolved: problems,
      rawItem: {
        platform: item.platform,
        sourceUrl: item.sourceUrl,
        title: item.title,
        content: item.content,
        authorName: item.authorName,
      },
    }),
  });

  const parsed = res.parsed!;

  return {
    isOpportunity: !!parsed.isOpportunity,
    opportunityType: normalizeEnum(parsed.opportunityType, OPPORTUNITY_TYPES, "CUSTOM_SOFTWARE"),
    intentLevel: normalizeEnum(parsed.intentLevel, INTENT_LEVELS, "MEDIUM"),
    detectedNeed: parsed.detectedNeed || item.title,
    detectedProblem: parsed.detectedProblem || "Unspecified workflow challenge",
    requestedSolution: parsed.requestedSolution || "",
    initialRelevanceScore: Math.min(100, Math.max(0, parsed.initialRelevanceScore ?? 50)),
  };
}

// ─── STAGE 3: DEEP SCORING & CAPABILITY MATCH (Strong reasoning) ────────────
export async function deepScoreCandidate(
  item: DiscoveredRawItem,
  classification: CandidateClassification,
  productProfile: {
    name: string;
    description: string;
    offer: string | null;
    problemsSolved: unknown;
    painPoints: unknown;
    strongDemandSignals: unknown;
    negativeSignals: unknown;
    technologies: unknown;
  },
  userCapability: {
    skills: unknown;
    services: unknown;
  } | null,
  userId: string,
): Promise<DetailedScoringResult> {
  const providerKeys = await getUserProviderKeys(userId);

  const toList = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);

  const res = await chatComplete({
    task: "analysis", // Uses strong reasoning model (Gemini Flash / Groq 70b)
    providerKeys,
    jsonMode: true,
    temperature: 0.3,
    schema: scoringSchema,
    messages: opportunityScorerPrompt({
      productProfile: {
        name: productProfile.name,
        description: productProfile.description,
        offer: productProfile.offer || productProfile.name,
        problemsSolved: toList(productProfile.problemsSolved),
        painPoints: toList(productProfile.painPoints),
        strongDemandSignals: toList(productProfile.strongDemandSignals),
        negativeSignals: toList(productProfile.negativeSignals),
        technologies: toList(productProfile.technologies),
      },
      userCapabilities: userCapability
        ? {
            skills: toList(userCapability.skills),
            services: toList(userCapability.services),
          }
        : undefined,
      opportunity: {
        platform: item.platform,
        sourceUrl: item.sourceUrl,
        title: item.title,
        content: item.content,
        authorName: item.authorName,
        detectedNeed: classification.detectedNeed,
        detectedProblem: classification.detectedProblem,
        opportunityType: classification.opportunityType,
        intentLevel: classification.intentLevel,
        publishedAt: item.publishedAt?.toISOString(),
      },
    }),
  });

  const parsed = res.parsed!;

  const intentScore = Math.min(30, Math.max(0, parsed.intentScore ?? 15));
  const commercialScore = Math.min(25, Math.max(0, parsed.commercialScore ?? 15));
  const capabilityMatchScore = Math.min(25, Math.max(0, parsed.capabilityMatchScore ?? 15));
  const recencyScore = Math.min(10, Math.max(0, parsed.recencyScore ?? 5));
  const confidenceScore = Math.min(10, Math.max(0, parsed.confidenceScore ?? 5));

  const overallScore =
    parsed.overallScore !== undefined
      ? Math.min(100, Math.max(0, parsed.overallScore))
      : intentScore + commercialScore + capabilityMatchScore + recencyScore + confidenceScore;

  return {
    intentScore,
    commercialScore,
    capabilityMatchScore,
    recencyScore,
    confidenceScore,
    overallScore,
    evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [item.title],
    whyThisIsAnOpportunity:
      parsed.whyThisIsAnOpportunity || "Shows alignment with software development needs.",
    recommendedOffer: parsed.recommendedOffer || productProfile.name,
    recommendedApproach:
      parsed.recommendedApproach || "Reach out referencing their specific requirement.",
  };
}

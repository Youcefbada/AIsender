import { prisma } from "@/lib/db";
import { chatComplete, parseJsonResponse } from "@/lib/ai/openrouter";
import { productIntelligencePrompt } from "@/lib/ai/prompts";
import { getUserProviderKeys } from "@/lib/keys";
import type { Prisma, ProductProfileStatus } from "@prisma/client";

export interface ProductProfileIntelligence {
  name: string;
  description: string;
  category?: string;
  subcategories: string[];
  problemsSolved: string[];
  painPoints: string[];
  useCases: string[];
  targetIndustries: string[];
  targetCompanyTypes: string[];
  targetCompanySizes: string[];
  targetGeographies: string[];
  buyerPersonas: string[];
  decisionMakerRoles: string[];
  strongDemandSignals: string[];
  mediumDemandSignals: string[];
  weakDemandSignals: string[];
  negativeSignals: string[];
  technologies: string[];
  platforms: string[];
  competitors: string[];
  keywords: string[];
  semanticConcepts: string[];
  generatedSearchQueries: {
    reddit: string[];
    web: string[];
    x: string[];
    forums: string[];
  };
  recommendedCommunities: string[];
}

// Pragmatic runtime validation: every required field must exist with the right
// primitive shape; optional/list fields are tolerated loosely downstream.
const STRING_ARRAY_FIELDS = [
  "subcategories",
  "problemsSolved",
  "painPoints",
  "useCases",
  "targetIndustries",
  "targetCompanyTypes",
  "targetCompanySizes",
  "targetGeographies",
  "buyerPersonas",
  "decisionMakerRoles",
  "strongDemandSignals",
  "mediumDemandSignals",
  "weakDemandSignals",
  "negativeSignals",
  "technologies",
  "platforms",
  "competitors",
  "keywords",
  "semanticConcepts",
  "recommendedCommunities",
] as const;

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

export function isProductProfileIntelligence(d: unknown): d is ProductProfileIntelligence {
  const o = d as Record<string, unknown>;
  if (!o || typeof o !== "object") return false;
  if (typeof o.name !== "string" || typeof o.description !== "string") return false;
  for (const f of STRING_ARRAY_FIELDS) {
    if (o[f] !== undefined && !isStringArray(o[f])) return false;
  }
  const q = o.generatedSearchQueries;
  if (q !== undefined) {
    if (typeof q !== "object" || q === null) return false;
    const qr = q as Record<string, unknown>;
    for (const k of ["reddit", "web", "x", "forums"]) {
      if (qr[k] !== undefined && !isStringArray(qr[k])) return false;
    }
  }
  return true;
}

export async function analyzeOffer(
  input: {
    offer: string;
    name?: string;
    description?: string;
    websiteUrl?: string;
    targetAudience?: string;
    price?: string;
    geo?: string;
    skills?: string[];
  },
  userId: string,
): Promise<{ intelligence: ProductProfileIntelligence; model: string }> {
  const providerKeys = await getUserProviderKeys(userId);

  const res = await chatComplete({
    task: "analysis",
    providerKeys,
    jsonMode: true,
    temperature: 0.4,
    maxTokens: 4000, // the intelligence payload is a large nested JSON
    messages: productIntelligencePrompt(input),
  });

  const parsed = parseJsonResponse<ProductProfileIntelligence>(res.content, isProductProfileIntelligence);
  return { intelligence: parsed, model: res.model };
}

export async function createOrUpdateProductProfile(
  userId: string,
  data: {
    id?: string;
    productId?: string;
    name: string;
    description: string;
    offer?: string;
    category?: string;
    subcategories?: string[];
    problemsSolved?: string[];
    painPoints?: string[];
    useCases?: string[];
    targetIndustries?: string[];
    targetCompanyTypes?: string[];
    targetCompanySizes?: string[];
    targetGeographies?: string[];
    buyerPersonas?: string[];
    decisionMakerRoles?: string[];
    strongDemandSignals?: string[];
    mediumDemandSignals?: string[];
    weakDemandSignals?: string[];
    negativeSignals?: string[];
    technologies?: string[];
    platforms?: string[];
    competitors?: string[];
    keywords?: string[];
    semanticConcepts?: string[];
    generatedSearchQueries?: Record<string, string[]>;
    recommendedCommunities?: string[];
    status?: ProductProfileStatus;
  },
) {
  const payload = {
    name: data.name,
    description: data.description,
    offer: data.offer ?? null,
    productId: data.productId ?? null,
    category: data.category ?? null,
    subcategories: (data.subcategories ?? []) as Prisma.InputJsonValue,
    problemsSolved: (data.problemsSolved ?? []) as Prisma.InputJsonValue,
    painPoints: (data.painPoints ?? []) as Prisma.InputJsonValue,
    useCases: (data.useCases ?? []) as Prisma.InputJsonValue,
    targetIndustries: (data.targetIndustries ?? []) as Prisma.InputJsonValue,
    targetCompanyTypes: (data.targetCompanyTypes ?? []) as Prisma.InputJsonValue,
    targetCompanySizes: (data.targetCompanySizes ?? []) as Prisma.InputJsonValue,
    targetGeographies: (data.targetGeographies ?? []) as Prisma.InputJsonValue,
    buyerPersonas: (data.buyerPersonas ?? []) as Prisma.InputJsonValue,
    decisionMakerRoles: (data.decisionMakerRoles ?? []) as Prisma.InputJsonValue,
    strongDemandSignals: (data.strongDemandSignals ?? []) as Prisma.InputJsonValue,
    mediumDemandSignals: (data.mediumDemandSignals ?? []) as Prisma.InputJsonValue,
    weakDemandSignals: (data.weakDemandSignals ?? []) as Prisma.InputJsonValue,
    negativeSignals: (data.negativeSignals ?? []) as Prisma.InputJsonValue,
    technologies: (data.technologies ?? []) as Prisma.InputJsonValue,
    platforms: (data.platforms ?? []) as Prisma.InputJsonValue,
    competitors: (data.competitors ?? []) as Prisma.InputJsonValue,
    keywords: (data.keywords ?? []) as Prisma.InputJsonValue,
    semanticConcepts: (data.semanticConcepts ?? []) as Prisma.InputJsonValue,
    generatedSearchQueries: (data.generatedSearchQueries ?? {}) as Prisma.InputJsonValue,
    recommendedCommunities: (data.recommendedCommunities ?? []) as Prisma.InputJsonValue,
    status: data.status ?? "ACTIVE",
  };

  if (data.id) {
    // Ownership check: no @@unique([id, userId]) exists, so findFirst then update by id.
    const existing = await prisma.productProfile.findFirst({
      where: { id: data.id, userId },
      select: { id: true },
    });
    if (!existing) throw new Error("Product profile not found");
    return prisma.productProfile.update({
      where: { id: existing.id },
      data: payload,
    });
  }

  return prisma.productProfile.create({
    data: {
      userId,
      ...payload,
    },
  });
}

export async function getProductProfile(userId: string, id: string) {
  return prisma.productProfile.findFirst({
    where: { id, userId },
    include: {
      _count: {
        select: {
          opportunities: true,
          searchRuns: true,
        },
      },
    },
  });
}

export async function listProductProfiles(userId: string) {
  return prisma.productProfile.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          opportunities: true,
        },
      },
    },
  });
}

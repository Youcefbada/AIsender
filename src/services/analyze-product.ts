import { prisma } from "@/lib/db";
import { chatComplete, parseJsonResponse } from "@/lib/ai/openrouter";
import { productAnalysisPrompt } from "@/lib/ai/prompts";
import { getUserProviderKeys } from "@/lib/keys";
import type { AudienceType, Prisma } from "@prisma/client";

// STEP 1 + ICP generation. Runs the analysis model, persists a single
// ProductAnalysis (latest wins) and replaces the product's ICP set.

interface AnalysisJson {
  summary: string;
  benefits: string[];
  targetAudience: string[];
  industries: string[];
  pricingTier?: string;
  audienceType: AudienceType;
  buyingIntent?: string;
  painPoints: string[];
  outreachAngles: string[];
  icps: {
    name: string;
    persona: string;
    industry?: string;
    companySize?: string;
    geo?: string;
    keywords: string[];
    searchQueries: string[];
  }[];
}

export async function analyzeProduct(productId: string) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
  });
  const providerKeys = await getUserProviderKeys(product.userId);

  await prisma.product.update({
    where: { id: productId },
    data: { status: "ANALYZING" },
  });

  let model: string, parsed: AnalysisJson;
  try {
    const res = await chatComplete({
      task: "analysis",
      providerKeys,
      jsonMode: true,
      temperature: 0.5,
      messages: productAnalysisPrompt(product),
    });
    model = res.model;
    parsed = parseJsonResponse<AnalysisJson>(res.content, (d): d is AnalysisJson => {
      const o = d as Record<string, unknown>;
      return (
        !!o &&
        typeof o === "object" &&
        typeof o.summary === "string" &&
        Array.isArray(o.benefits) &&
        Array.isArray(o.targetAudience) &&
        Array.isArray(o.industries) &&
        Array.isArray(o.painPoints) &&
        Array.isArray(o.outreachAngles)
      );
    });
  } catch (err) {
    // Don't leave the product stuck in ANALYZING — reset so it can be retried.
    await prisma.product.update({ where: { id: productId }, data: { status: "DRAFT" } });
    throw err;
  }

  const analysis = await prisma.$transaction(async (tx) => {
    await tx.productAnalysis.deleteMany({ where: { productId } });
    const created = await tx.productAnalysis.create({
      data: {
        productId,
        summary: parsed.summary,
        benefits: parsed.benefits as Prisma.InputJsonValue,
        targetAudience: parsed.targetAudience as Prisma.InputJsonValue,
        industries: parsed.industries as Prisma.InputJsonValue,
        pricingTier: parsed.pricingTier,
        audienceType: parsed.audienceType ?? "B2B",
        buyingIntent: parsed.buyingIntent,
        painPoints: parsed.painPoints as Prisma.InputJsonValue,
        outreachAngles: parsed.outreachAngles as Prisma.InputJsonValue,
        model,
        rawResponse: parsed as unknown as Prisma.InputJsonValue,
      },
    });

    await tx.icp.deleteMany({ where: { productId } });
    if (parsed.icps?.length) {
      await tx.icp.createMany({
        data: parsed.icps.map((icp, i) => ({
          productId,
          name: icp.name,
          persona: icp.persona,
          industry: icp.industry,
          companySize: icp.companySize,
          geo: icp.geo,
          keywords: icp.keywords as Prisma.InputJsonValue,
          searchQueries: icp.searchQueries as Prisma.InputJsonValue,
          priority: parsed.icps.length - i,
        })),
      });
    }

    await tx.product.update({
      where: { id: productId },
      data: { status: "READY" },
    });

    return created;
  });

  return analysis;
}

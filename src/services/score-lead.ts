import { prisma } from "@/lib/db";
import { chatComplete, parseJsonResponse } from "@/lib/ai/openrouter";
import { scoringPrompt } from "@/lib/ai/prompts";
import { normalizeScore, isQualified, type ScoreDimensions } from "@/lib/scoring";
import type { Provider } from "@/lib/ai/models";

// STEP 3: score a single lead against a product analysis, persist the breakdown,
// and update the lead's status/total. Returns whether it qualified.

interface AnalysisLike {
  summary: string;
  industries: string[];
  painPoints: string[];
}

export async function scoreLead(
  leadId: string,
  analysis: AnalysisLike,
  threshold: number,
  providerKeys?: Partial<Record<Provider, string>>,
): Promise<{ total: number; qualified: boolean }> {
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: leadId },
    include: { research: true },
  });

  const researchText = lead.research
    ? `${lead.research.aboutSummary ?? ""} ${JSON.stringify(lead.research.services ?? [])}`
    : null;

  const { content, model } = await chatComplete({
    task: "scoring",
    providerKeys,
    jsonMode: true,
    temperature: 0.2,
    messages: scoringPrompt({
      productSummary: analysis.summary,
      industries: analysis.industries,
      painPoints: analysis.painPoints,
      lead: {
        company: lead.company,
        website: lead.website,
        industry: lead.industry,
        companySize: lead.companySize,
        research: researchText,
      },
    }),
  });

  const raw = parseJsonResponse<Partial<ScoreDimensions> & { reasoning?: string }>(content);
  const score = normalizeScore(raw);
  const qualified = isQualified(score.total, threshold);

  await prisma.$transaction([
    prisma.leadScore.upsert({
      where: { leadId },
      create: { leadId, ...score, model },
      update: { ...score, model },
    }),
    prisma.lead.update({
      where: { id: leadId },
      data: { scoreTotal: score.total, status: qualified ? "QUALIFIED" : "DISQUALIFIED" },
    }),
  ]);

  return { total: score.total, qualified };
}

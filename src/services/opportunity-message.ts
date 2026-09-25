import { prisma } from "@/lib/db";
import { chatComplete, parseJsonResponse } from "@/lib/ai/openrouter";
import { opportunityMessagePrompt } from "@/lib/ai/prompts";
import { getUserProviderKeys } from "@/lib/keys";

export async function generateOpportunityMessage(
  opportunityId: string,
  userId: string,
): Promise<{ subject: string; messageText: string }> {
  const opp = await prisma.opportunity.findFirst({
    where: { id: opportunityId, userId },
    include: { productProfile: true, user: { select: { name: true } } },
  });
  if (!opp) throw new Error("Opportunity not found");

  const providerKeys = await getUserProviderKeys(userId);
  const evidence = Array.isArray(opp.evidence) ? (opp.evidence as string[]) : [];

  const res = await chatComplete({
    task: "email",
    providerKeys,
    jsonMode: true,
    temperature: 0.4,
    messages: opportunityMessagePrompt({
      providerName: opp.user.name || undefined,
      offer: opp.productProfile.offer || opp.productProfile.description,
      opportunity: {
        platform: opp.platform,
        authorName: opp.authorName || undefined,
        authorUsername: opp.authorUsername || undefined,
        title: opp.detectedNeed || opp.originalText.slice(0, 100),
        content: opp.originalText,
        detectedNeed: opp.detectedNeed || "",
        evidence,
        recommendedOffer: opp.recommendedOffer || undefined,
        recommendedApproach: opp.recommendedApproach || undefined,
      },
    }),
  });

  const parsed = parseJsonResponse<{
    subject: string;
    messageText: string;
  }>(
    res.content,
    (d): d is { subject: string; messageText: string } => {
      const o = d as Record<string, unknown>;
      return (
        !!o &&
        typeof o === "object" &&
        typeof o.subject === "string" &&
        typeof o.messageText === "string"
      );
    },
  );

  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      suggestedMessage: `${parsed.subject}\n\n${parsed.messageText}`,
    },
  });

  return parsed;
}

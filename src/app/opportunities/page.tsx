import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/page-auth";
import { AppShell } from "@/components/app-shell";
import { OpportunityList, type OpportunityItem } from "@/components/opportunities/opportunity-list";
import { QuotaTracker } from "@/components/quota-tracker";

export default async function OpportunitiesPage() {
  const userId = await requirePageUser();

  const [opportunities, profiles] = await Promise.all([
    prisma.opportunity.findMany({
      where: { userId },
      orderBy: [{ overallScore: "desc" }, { createdAt: "desc" }],
      include: {
        productProfile: {
          select: { id: true, name: true },
        },
      },
      take: 100,
    }),
    prisma.productProfile.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const formatted: OpportunityItem[] = opportunities.map((o) => ({
    id: o.id,
    sourceUrl: o.sourceUrl,
    platform: o.platform,
    authorName: o.authorName,
    authorUsername: o.authorUsername,
    authorProfileUrl: o.authorProfileUrl,
    companyName: o.companyName,
    companyDomain: o.companyDomain,
    publishedAt: o.publishedAt ? o.publishedAt.toISOString() : null,
    discoveredAt: o.discoveredAt.toISOString(),
    originalText: o.originalText,
    detectedNeed: o.detectedNeed,
    detectedProblem: o.detectedProblem,
    opportunityType: o.opportunityType,
    intentLevel: o.intentLevel,
    intentScore: o.intentScore,
    commercialScore: o.commercialScore,
    capabilityMatchScore: o.capabilityMatchScore,
    recencyScore: o.recencyScore,
    confidenceScore: o.confidenceScore,
    overallScore: o.overallScore,
    evidence: Array.isArray(o.evidence) ? (o.evidence as string[]) : null,
    whyThisIsAnOpportunity: o.whyThisIsAnOpportunity,
    recommendedOffer: o.recommendedOffer,
    recommendedApproach: o.recommendedApproach,
    suggestedMessage: o.suggestedMessage,
    status: o.status,
    email: o.email,
    emailConfidence: o.emailConfidence,
    contactUrl: o.contactUrl,
    productProfile: o.productProfile
      ? { id: o.productProfile.id, name: o.productProfile.name }
      : undefined,
  }));

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Software Demand & Opportunity Scout</h1>
          <p className="text-xs text-[var(--muted-foreground)]">
            Discovered people and companies actively requesting software, AI agents, automation, and developers.
          </p>
        </div>

        <QuotaTracker />

        <OpportunityList
          initialOpportunities={formatted}
          profiles={profiles}
        />
      </div>
    </AppShell>
  );
}

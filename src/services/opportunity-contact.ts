import { prisma } from "@/lib/db";
import { findContacts } from "@/lib/contact/find";
import { validateEmail } from "@/lib/email/validate";
import { getUserSecret } from "@/lib/keys";
import type { EmailConfidence } from "@prisma/client";

export async function discoverOpportunityContact(
  opportunityId: string,
  userId: string,
): Promise<{ email?: string; confidence: EmailConfidence; contactUrl?: string }> {
  const opp = await prisma.opportunity.findFirst({
    where: { id: opportunityId, userId },
  });
  if (!opp) throw new Error("Opportunity not found");

  // 1. If company domain or website exists, use our polite internal contact scraper
  let domain = opp.companyDomain;
  if (!domain && opp.companyUrl) {
    try {
      domain = new URL(opp.companyUrl).hostname.replace(/^www\./, "");
    } catch {
      /* ignore */
    }
  }

  // Social platforms don't expose company contact emails — skip scraping
  // them and any Hunter lookup (matches the "no contacts found" return shape).
  if (
    domain &&
    /^(www\.)?(reddit|twitter|x|linkedin|youtube|facebook|instagram|tiktok)\.(com|co)$/i.test(domain)
  ) {
    const contactUrl = opp.authorProfileUrl || opp.sourceUrl;
    await prisma.opportunity.update({
      where: { id: opportunityId },
      data: { contactUrl },
    });
    return { confidence: "NONE", contactUrl };
  }

  if (domain) {
    try {
      const contacts = await findContacts(domain);
      for (const c of contacts) {
        if (!c.email) continue;
        const validation = await validateEmail(c.email);
        if (validation.verdict === "VALID") {
          const confidence: EmailConfidence = "VERIFIED";
          await prisma.opportunity.update({
            where: { id: opportunityId },
            data: {
              email: c.email,
              emailConfidence: confidence,
              contactUrl: c.source,
            },
          });
          return { email: c.email, confidence, contactUrl: c.source };
        } else if (validation.verdict === "RISKY") {
          const confidence: EmailConfidence = "ROLE_BASED";
          await prisma.opportunity.update({
            where: { id: opportunityId },
            data: {
              email: c.email,
              emailConfidence: confidence,
              contactUrl: c.source,
            },
          });
          return { email: c.email, confidence, contactUrl: c.source };
        }
      }
    } catch (err) {
      console.warn("Internal contact scraper notice:", err);
    }

    // 2. Check Hunter optional adapter if user set a HUNTER key in settings
    const hunterKey = await getUserSecret(userId, "HUNTER");
    if (hunterKey) {
      try {
        const res = await fetch(
          `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${encodeURIComponent(hunterKey)}&limit=1`,
        );
        if (res.ok) {
          const data = (await res.json()) as {
            data?: { emails?: { value: string; confidence?: number; type?: string }[] };
          };
          const top = data.data?.emails?.[0];
          if (top?.value) {
            const confidence: EmailConfidence = (top.confidence ?? 0) > 80 ? "VERIFIED" : "GUESSED";
            await prisma.opportunity.update({
              where: { id: opportunityId },
              data: {
                email: top.value,
                emailConfidence: confidence,
                contactUrl: `https://${domain}`,
              },
            });
            return { email: top.value, confidence, contactUrl: `https://${domain}` };
          }
        }
      } catch (err) {
        console.warn("Hunter enrichment notice:", err);
      }
    }
  }

  // Fallback: If no direct email discovered, contactUrl points to the author profile or post
  const contactUrl = opp.authorProfileUrl || opp.sourceUrl;
  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: { contactUrl },
  });

  return { confidence: "NONE", contactUrl };
}

import { prisma } from "@/lib/db";
import { fetchHtml, htmlToText } from "@/lib/fetch-page";
import { chatComplete, parseJsonResponse } from "@/lib/ai/openrouter";
import type { Provider } from "@/lib/ai/models";
import type { Prisma } from "@prisma/client";

// STEP 5: per-prospect research. Fetches the company's site text and asks the
// model to extract concrete, real personalization hooks. Persists one
// ProspectResearch per lead. Honest-by-design: if we can't read the site, we
// store nothing rather than fabricate.

interface ResearchJson {
  services: string[];
  aboutSummary: string;
  personalizationHooks: string[];
  techStack?: string[];
}

export async function researchProspect(
  leadId: string,
  providerKeys?: Partial<Record<Provider, string>>,
) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  if (!lead.website) return null;

  const html = await fetchHtml(lead.website);
  if (!html) return null;
  const text = htmlToText(html);
  if (text.length < 200) return null;

  const { content, model } = await chatComplete({
    task: "research",
    providerKeys,
    jsonMode: true,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "You extract factual details from a company's website for outreach personalization. Only state what is supported by the text. NEVER invent facts. Respond ONLY with valid JSON.",
      },
      {
        role: "user",
        content: `Company: ${lead.company}
Website text (truncated):
"""${text}"""

Return JSON:
{
  "services": ["concrete services/products they offer"],
  "aboutSummary": "1-2 sentence factual summary",
  "personalizationHooks": ["specific, real details an outreach email could reference"],
  "techStack": ["only if evident, else empty"]
}`,
      },
    ],
  });

  const parsed = parseJsonResponse<ResearchJson>(content);

  const research = await prisma.prospectResearch.upsert({
    where: { leadId },
    create: {
      leadId,
      services: parsed.services as Prisma.InputJsonValue,
      aboutSummary: parsed.aboutSummary,
      personalizationHooks: parsed.personalizationHooks as Prisma.InputJsonValue,
      techStack: (parsed.techStack ?? []) as Prisma.InputJsonValue,
      model,
    },
    update: {
      services: parsed.services as Prisma.InputJsonValue,
      aboutSummary: parsed.aboutSummary,
      personalizationHooks: parsed.personalizationHooks as Prisma.InputJsonValue,
      techStack: (parsed.techStack ?? []) as Prisma.InputJsonValue,
      model,
    },
  });

  await prisma.lead.update({ where: { id: leadId }, data: { status: "RESEARCHED" } });
  return research;
}

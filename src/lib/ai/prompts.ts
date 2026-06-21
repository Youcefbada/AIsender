// Prompt builders. Kept separate from transport so they can be unit-tested and
// versioned independently. Every prompt asks for strict JSON we can validate.

export function productAnalysisPrompt(input: {
  name: string;
  url: string;
  description: string;
  notes?: string | null;
}) {
  return [
    {
      role: "system" as const,
      content:
        "You are a B2B go-to-market analyst. Analyze products and produce precise, non-generic ICPs. Respond ONLY with valid JSON matching the requested schema. No prose.",
    },
    {
      role: "user" as const,
      content: `Analyze this product and return JSON.

Product name: ${input.name}
URL: ${input.url}
Description: ${input.description}
Notes: ${input.notes || "(none)"}

Return JSON with this exact shape:
{
  "summary": "one paragraph: what it does",
  "benefits": ["..."],
  "targetAudience": ["..."],
  "industries": ["..."],
  "pricingTier": "free|low|mid|enterprise",
  "audienceType": "B2B|B2C|BOTH",
  "buyingIntent": "low|medium|high",
  "painPoints": ["..."],
  "outreachAngles": ["..."],
  "icps": [
    {
      "name": "short label",
      "persona": "1-2 sentence buyer persona",
      "industry": "...",
      "companySize": "1-10|11-50|51-200|201-1000|1000+",
      "geo": "optional or empty",
      "keywords": ["..."],
      "searchQueries": ["concrete query to find these businesses"]
    }
  ]
}
Produce 2-4 sharply-defined ICPs. Avoid generic audiences. searchQueries must be specific enough to find real businesses.`,
    },
  ];
}

export function scoringPrompt(input: {
  productSummary: string;
  industries: string[];
  painPoints: string[];
  lead: {
    company: string;
    website?: string | null;
    industry?: string | null;
    companySize?: string | null;
    research?: string | null;
  };
}) {
  return [
    {
      role: "system" as const,
      content:
        "You score how well a prospect matches a product. Be skeptical: most leads are NOT a strong fit. Respond ONLY with valid JSON.",
    },
    {
      role: "user" as const,
      content: `Product: ${input.productSummary}
Target industries: ${input.industries.join(", ")}
Product solves: ${input.painPoints.join(", ")}

Prospect:
Company: ${input.lead.company}
Website: ${input.lead.website || "n/a"}
Industry: ${input.lead.industry || "unknown"}
Size: ${input.lead.companySize || "unknown"}
Research: ${input.lead.research || "none"}

Score each dimension within its cap and explain briefly. Return JSON:
{
  "industryMatch": 0-30,
  "companySizeMatch": 0-20,
  "websiteQuality": 0-10,
  "socialActivity": 0-15,
  "technologyMatch": 0-15,
  "painPointMatch": 0-25,
  "reasoning": "2-3 sentences"
}`,
    },
  ];
}

export function emailPrompt(input: {
  productName: string;
  productUrl: string;
  affiliateUrl?: string | null;
  outreachAngle: string;
  benefit: string;
  senderName: string;
  lead: {
    company: string;
    contactName?: string | null;
    services?: string | null;
    hooks?: string | null;
  };
  stepPurpose?: string;
}) {
  return [
    {
      role: "system" as const,
      content:
        "You write short, human, genuinely personalized B2B outreach emails. NO hype, NO fake urgency, NO spam phrases, NO emoji. Reference real specifics. Sound like a thoughtful person, not a template. Respond ONLY with valid JSON.",
    },
    {
      role: "user" as const,
      content: `Write a cold outreach email.

From: ${input.senderName}
Product: ${input.productName} (${input.affiliateUrl || input.productUrl})
Outreach angle: ${input.outreachAngle}
Key benefit to highlight: ${input.benefit}
${input.stepPurpose ? `This is a follow-up. Purpose: ${input.stepPurpose}` : "This is the first email."}

Recipient:
Company: ${input.lead.company}
Contact: ${input.lead.contactName || "(unknown — keep greeting generic but warm)"}
Their services: ${input.lead.services || "unknown"}
Specific details to reference: ${input.lead.hooks || "none — be honest, don't fabricate"}

Rules:
- Subject under 60 chars, specific, not clickbait.
- Body 80-130 words. One clear, low-friction ask.
- Reference something real about them. NEVER invent facts.
- Plain, conversational. No "I hope this finds you well".

Return JSON: { "subject": "...", "bodyText": "...", "bodyHtml": "<p>...</p>" }`,
    },
  ];
}

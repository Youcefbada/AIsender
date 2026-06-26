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
Produce 2-4 sharply-defined ICPs. Avoid generic audiences.

searchQueries RULES (critical): each must find BUSINESS WEBSITES (agencies,
companies, studios, shops, firms) that publish a public contact email — NOT
social profiles or job boards. Do NOT use site: operators (no site:linkedin.com,
site:instagram.com, site:facebook.com, site:youtube.com, site:behance.net).
Write plain Google queries, e.g. "product photography studios contact",
"ecommerce marketing agencies email", "<niche> companies in <geo>".`,
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
        "You score how well a prospect matches a product. Score FAIRLY and calibrated: a clear industry / pain-point fit should land around 70-90; a plausible fit 50-70; only score below 40 when the prospect is clearly irrelevant. Don't penalize just because info is limited — infer from the company name, domain, and any research. Respond ONLY with valid JSON.",
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
  productSummary?: string;
  outreachAngle: string;
  benefit: string;
  senderName: string;
  language?: string; // e.g. "French" — write the whole email in this language
  lead: {
    company: string;
    contactName?: string | null;
    services?: string | null;
    hooks?: string | null;
  };
  stepPurpose?: string;
}) {
  const language = input.language || "English";
  return [
    {
      role: "system" as const,
      content:
        `You are an elite cold-email copywriter. You write short, punchy, personalized B2B emails that make the reader curious enough to click. Write the ENTIRE email (subject + body) in ${language}, native and fluent. Be SPECIFIC and CONFIDENT — never hedge. BANNED phrases: "I came across", "I hope this finds you", "likely", "I'm sure", "I noticed your", "as a leading". No hype, no emoji, no spam words ("free", "guarantee", "act now"). Use exactly ONE concrete, real detail about the company (from the research given) — never invent. Respond ONLY with valid JSON.`,
    },
    {
      role: "user" as const,
      content: `Write a cold outreach email that earns a click.

From: ${input.senderName}
Product: ${input.productName}
What it actually does: ${input.productSummary || input.benefit}
Best benefit to lead with: ${input.benefit}
Angle: ${input.outreachAngle}
${input.stepPurpose ? `This is a follow-up. Purpose: ${input.stepPurpose}` : "This is the first email."}

Recipient:
Company: ${input.lead.company}
Contact: ${input.lead.contactName || "(no name — open with a natural line, NOT 'Dear team')"}
What they do: ${input.lead.services || "unknown"}
Real details (use ONE, naturally): ${input.lead.hooks || "none — stay concrete about their field, do NOT fabricate"}

Structure (3-4 tight sentences):
1) Open with a specific, true observation about THEM (use a real detail). No "I came across".
2) Bridge to ONE concrete thing ${input.productName} does for a company like theirs — name a specific capability or result. NEVER write vague filler like "saves time" or "drives results" on its own; say what it actually does.
3) End with a SHORT curiosity line, varied and tailored to them, that makes them want to see it (don't reuse a stock phrase, don't say "click"). A button is added right after, so do NOT write any URL.

Hard rules:
- 50-90 words TOTAL. Tight and concrete. Cut filler.
- Subject: 3-6 words, specific + a little curiosity, lowercase fine, no clickbait, no "free".
- Confident, human, conversational. One idea only. No hedging, no "Dear team", no signature block.

Return JSON: { "subject": "...", "bodyText": "...", "bodyHtml": "<p>...</p>" }`,
    },
  ];
}

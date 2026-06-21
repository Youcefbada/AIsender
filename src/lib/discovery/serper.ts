import type { DiscoveryProvider, DiscoveredLead, DiscoveryQuery } from "./provider";
import { normalizeDomain } from "@/lib/utils";

// Serper.dev discovery provider (Google results via a simple API).
// Free tier: 2,500 searches/month, no credit card. Set SERPER_API_KEY to enable.
// Chosen over Google CSE because CSE is now closed to new customers.

interface SerperOrganic {
  title: string;
  link: string;
  snippet?: string;
}

// Aggregators / social / job boards / Q&A / news / academic — not sellable
// businesses with a public contact email.
const SKIP_NAMES =
  /(facebook|linkedin|twitter|instagram|youtube|yelp|wikipedia|amazon|google|reddit|pinterest|tiktok|behance|indeed|ziprecruiter|glassdoor|simplyhired|monster|lever|greenhouse|workable|quora|medium|substack|sciencedirect|researchgate|crunchbase|bloomberg|forbes|nytimes|yulys|loc\.gov)\./;

function isJunk(domain: string): boolean {
  if (SKIP_NAMES.test(domain)) return true;
  if (/\.gov(\.|$)/.test(domain) || /\.edu(\.|$)/.test(domain)) return true;
  return false;
}

// Strip `site:` operators (often pointing at social platforms we skip) so the
// query becomes a general web search that surfaces real company websites.
function cleanQuery(q: string): string {
  return q
    .replace(/\bsite:\S+\s*/gi, "")
    .replace(/\s+AND\s+/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export const serperProvider: DiscoveryProvider = {
  name: "serper",
  async search(query: DiscoveryQuery): Promise<DiscoveredLead[]> {
    const key = query.apiKey || process.env.SERPER_API_KEY;
    if (!key) return [];

    const seen = new Set<string>();
    const leads: DiscoveredLead[] = [];

    for (const q of query.queries) {
      if (leads.length >= query.limit) break;
      const term = [cleanQuery(q), query.geo].filter(Boolean).join(" ");
      try {
        const res = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: { "X-API-KEY": key, "Content-Type": "application/json" },
          body: JSON.stringify({ q: term, num: 10 }),
        });
        if (!res.ok) continue;
        const data = (await res.json()) as { organic?: SerperOrganic[] };
        for (const item of data.organic ?? []) {
          const domain = normalizeDomain(item.link);
          if (!domain || seen.has(domain) || isJunk(domain)) continue;
          seen.add(domain);
          leads.push({
            company: item.title.split(/[|\-–—]/)[0].trim().slice(0, 80) || domain,
            website: `https://${domain}`,
            industry: query.industry,
            geo: query.geo,
            source: "serper",
            sourceUrl: item.link,
          });
          if (leads.length >= query.limit) break;
        }
      } catch {
        // skip this query on error
      }
    }
    return leads;
  },
};

import type { DiscoveryProvider, DiscoveredLead, DiscoveryQuery } from "./provider";
import { normalizeDomain } from "@/lib/utils";

// Google Programmable Search (Custom Search JSON API) discovery provider.
// Free tier: 100 queries/day. Set GOOGLE_CSE_KEY and GOOGLE_CSE_CX to enable.
//
// We turn each ICP search query into web results, then treat each result domain
// as a candidate business. Scoring downstream decides if it's actually a fit.

interface CseItem {
  title: string;
  link: string;
  displayLink: string;
  snippet?: string;
}

export const googleCseProvider: DiscoveryProvider = {
  name: "google-cse",
  async search(query: DiscoveryQuery): Promise<DiscoveredLead[]> {
    const key = process.env.GOOGLE_CSE_KEY;
    const cx = process.env.GOOGLE_CSE_CX;
    if (!key || !cx) return [];

    const seen = new Set<string>();
    const leads: DiscoveredLead[] = [];

    for (const q of query.queries) {
      if (leads.length >= query.limit) break;
      const term = [q, query.geo].filter(Boolean).join(" ");
      const url = new URL("https://www.googleapis.com/customsearch/v1");
      url.searchParams.set("key", key);
      url.searchParams.set("cx", cx);
      url.searchParams.set("q", term);
      url.searchParams.set("num", "10");

      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = (await res.json()) as { items?: CseItem[] };
        for (const item of data.items ?? []) {
          const domain = normalizeDomain(item.link);
          if (!domain || seen.has(domain)) continue;
          // skip obvious aggregators/marketplaces
          if (/(facebook|linkedin|twitter|x|instagram|youtube|yelp|wikipedia|amazon|google)\./.test(domain)) {
            continue;
          }
          seen.add(domain);
          leads.push({
            company: item.title.split(/[|\-–—]/)[0].trim().slice(0, 80) || domain,
            website: `https://${domain}`,
            industry: query.industry,
            geo: query.geo,
            source: "google-cse",
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

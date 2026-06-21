// Lead discovery provider abstraction (STEP 2).
//
// Discovery is the part most likely to change (and the part with legal/ToS
// nuance), so it sits behind an interface. Swap providers without touching the
// agent pipeline. Ship with a manual/CSV provider + a pluggable web-search
// provider; add SerpAPI/Google CSE/Bing later by implementing this interface.
//
// IMPORTANT: only collect publicly available business contact data, respect
// robots.txt and provider ToS, and never scrape gated/private data.

import { googleCseProvider } from "./google-cse";
import { serperProvider } from "./serper";

export interface DiscoveredLead {
  company: string;
  website?: string;
  industry?: string;
  companySize?: string;
  geo?: string;
  source: string;
  sourceUrl?: string;
}

export interface DiscoveryQuery {
  queries: string[]; // ICP.searchQueries
  industry?: string;
  geo?: string;
  limit: number;
  apiKey?: string; // per-user provider key (falls back to env when absent)
}

export interface DiscoveryProvider {
  readonly name: string;
  search(query: DiscoveryQuery): Promise<DiscoveredLead[]>;
}

// Default no-op provider so the pipeline runs end-to-end before a real provider
// is wired. Replace by setting DISCOVERY_PROVIDER and implementing search().
export const manualProvider: DiscoveryProvider = {
  name: "manual",
  async search() {
    return [];
  },
};

export function getProvider(): DiscoveryProvider {
  // Auto-select: Serper (free, recommended) → Google CSE (legacy/existing keys)
  // → manual/CSV import. Override with DISCOVERY_PROVIDER=manual|serper|google-cse.
  const explicit = process.env.DISCOVERY_PROVIDER;
  const hasSerper = !!process.env.SERPER_API_KEY;
  const hasCse = !!(process.env.GOOGLE_CSE_KEY && process.env.GOOGLE_CSE_CX);
  if (explicit === "manual") return manualProvider;
  if (explicit === "serper") return serperProvider;
  if (explicit === "google-cse") return googleCseProvider;
  if (hasSerper) return serperProvider;
  if (hasCse) return googleCseProvider;
  return manualProvider;
}

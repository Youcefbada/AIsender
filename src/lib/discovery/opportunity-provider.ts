import type { OpportunityPlatform } from "@prisma/client";

export interface DiscoveredRawItem {
  platform: OpportunityPlatform;
  source: string; // e.g. "reddit", "serper", "x", "web", "forum"
  sourceUrl: string; // REAL URL only, never fabricated
  sourceExternalId?: string;
  title: string;
  content: string;
  authorName?: string;
  authorUsername?: string;
  authorProfileUrl?: string;
  companyName?: string;
  companyDomain?: string;
  location?: string;
  publishedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface OpportunityQuery {
  queries: string[];
  communities?: string[]; // e.g. subreddits
  limit: number;
  apiKey?: string;
  targetGeos?: string[];
  timeframe?: "day" | "week" | "month" | "year" | "all";
}

export interface OpportunityDiscoveryProvider {
  readonly name: string;
  search(query: OpportunityQuery): Promise<DiscoveredRawItem[]>;
}

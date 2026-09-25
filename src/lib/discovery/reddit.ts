import type {
  OpportunityDiscoveryProvider,
  OpportunityQuery,
  DiscoveredRawItem,
} from "./opportunity-provider";

interface RedditPostData {
  id: string;
  name: string;
  title: string;
  selftext?: string;
  author: string;
  permalink: string;
  url: string;
  created_utc: number;
  subreddit: string;
  score: number;
  num_comments: number;
  over_18?: boolean;
}

interface RedditListingResponse {
  data?: {
    children?: {
      kind: string;
      data: RedditPostData;
    }[];
  };
}

const DEFAULT_SUBREDDITS = [
  "Entrepreneur",
  "smallbusiness",
  "SaaS",
  "startups",
  "webdev",
  "forhire",
  "freelance",
  "AI_Agents",
  "ecommerce",
  "shopify",
];

export class RedditDiscoveryProvider implements OpportunityDiscoveryProvider {
  readonly name = "reddit";
  private userAgent = "AIToolSender-Scout/1.0 (demand discovery tool)";

  async search(query: OpportunityQuery): Promise<DiscoveredRawItem[]> {
    const results: DiscoveredRawItem[] = [];
    const seenUrls = new Set<string>();

    // When the user has stored a Reddit API token (Settings → ApiKeysForm), hit
    // the authenticated oauth.reddit.com endpoints (public .json endpoints are
    // blocked from cloud IPs). Falls back to public search without a key.
    const token = query.apiKey?.trim();
    const authHeaders: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};
    const baseUrl = token ? "https://oauth.reddit.com" : "https://www.reddit.com";

    const subreddits = (query.communities && query.communities.length > 0)
      ? query.communities.map((s) => s.replace(/^r\//, "").trim()).filter(Boolean)
      : DEFAULT_SUBREDDITS;

    const queries = query.queries.slice(0, 6); // Keep to reasonable number to respect free limits
    const limitPerQuery = Math.max(5, Math.ceil(query.limit / (queries.length || 1)));

    for (const q of queries) {
      if (results.length >= query.limit) break;

      // 1. Try targeted search in top relevant subreddits
      const targetSub = subreddits[results.length % subreddits.length];
      const urls = [
        `${baseUrl}/r/${targetSub}/search?q=${encodeURIComponent(q)}&restrict_sr=1&sort=new&t=month&limit=${limitPerQuery}`,
        `${baseUrl}/search?q=${encodeURIComponent(q)}&sort=new&t=month&limit=${limitPerQuery}`,
      ];

      for (const endpoint of urls) {
        if (results.length >= query.limit) break;

        try {
          const res = await fetch(`${endpoint}.json`, {
            headers: {
              "User-Agent": this.userAgent,
              Accept: "application/json",
              ...authHeaders,
            },
            signal: AbortSignal.timeout(15000),
          });

          if (!res.ok) {
            // If rate limited (429) or blocked, graceful backoff
            continue;
          }

          const data = (await res.json()) as RedditListingResponse;
          const items = data.data?.children ?? [];

          for (const item of items) {
            const p = item.data;
            if (!p || !p.title || p.author === "[deleted]" || p.author === "AutoModerator") {
              continue;
            }

            const permalink = p.permalink
              ? `https://www.reddit.com${p.permalink}`
              : `https://www.reddit.com/r/${p.subreddit}/comments/${p.id}`;

            if (seenUrls.has(permalink)) continue;
            seenUrls.add(permalink);

            const content = (p.selftext || p.title).trim();
            // Filter out empty or trivially short non-informative content
            if (content.length < 20) continue;

            results.push({
              platform: "REDDIT",
              source: "reddit",
              sourceUrl: permalink,
              sourceExternalId: p.name || p.id,
              title: p.title,
              content: content.slice(0, 4000),
              authorName: p.author,
              authorUsername: p.author,
              authorProfileUrl: `https://www.reddit.com/user/${p.author}`,
              publishedAt: p.created_utc ? new Date(p.created_utc * 1000) : undefined,
              metadata: {
                subreddit: p.subreddit,
                score: p.score,
                comments: p.num_comments,
              },
            });

            if (results.length >= query.limit) break;
          }
        } catch (err) {
          // Non-fatal, continue with other queries
          console.warn("Reddit search fetch warning:", err);
        }

        // Polite delay between Reddit public search requests
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    return results;
  }
}

export const redditDiscoveryProvider = new RedditDiscoveryProvider();

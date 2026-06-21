import { fetchHtml, absoluteUrl } from "@/lib/fetch-page";

// Contact discovery (STEP 4). Fetches a company's homepage, follows likely
// contact/about links, and extracts publicly listed email addresses.
//
// Public data only. We extract emails the business has chosen to publish on its
// own site. No guessing/permutation of private addresses.

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const CONTACT_HINTS = ["contact", "about", "team", "company", "impressum"];

// Junk emails to ignore (asset/CDN/example/placeholder noise).
const IGNORE =
  /(\.png|\.jpg|\.jpeg|\.gif|\.svg|\.webp|@2x|@sentry\.|wixpress|@example|example\.com|your@|@your|youremail|yourdomain|yourname|email@|name@|user@|test@|domain\.com|sentry|@email\.com)/i;

export interface FoundContact {
  email: string;
  source: string;
}

function extractEmails(html: string, source: string): FoundContact[] {
  const found = new Set<string>();
  for (const m of html.matchAll(EMAIL_RE)) {
    const email = m[0].toLowerCase();
    if (IGNORE.test(email)) continue;
    if (email.length > 120) continue;
    found.add(email);
  }
  return [...found].map((email) => ({ email, source }));
}

function contactLinks(html: string, base: string): string[] {
  const links = new Set<string>();
  for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
    const href = m[1];
    if (CONTACT_HINTS.some((h) => href.toLowerCase().includes(h))) {
      const abs = absoluteUrl(base, href);
      if (abs && abs.startsWith("http")) links.add(abs);
    }
  }
  return [...links].slice(0, 3); // be polite — at most a few extra fetches
}

export async function findContacts(website: string): Promise<FoundContact[]> {
  const base = website.includes("://") ? website : `https://${website}`;
  const home = await fetchHtml(base);
  if (!home) return [];

  const all = new Map<string, FoundContact>();
  for (const c of extractEmails(home, base)) all.set(c.email, c);

  for (const link of contactLinks(home, base)) {
    const page = await fetchHtml(link);
    if (!page) continue;
    for (const c of extractEmails(page, link)) {
      if (!all.has(c.email)) all.set(c.email, c);
    }
  }

  // Prefer non-role addresses first; cap results.
  return [...all.values()].slice(0, 5);
}

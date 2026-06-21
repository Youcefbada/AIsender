// Minimal, polite HTML fetcher for public pages (contact discovery + research).
// - identifies itself with a UA
// - short timeout, capped body size
// - strips tags to text for LLM consumption
//
// Only fetch publicly accessible pages. Callers should respect robots.txt and
// each site's ToS; this is for reading public business contact/About pages.

const UA =
  "AIToolSenderBot/0.1 (+https://github.com/; respectful public-page reader)";

export async function fetchHtml(
  url: string,
  timeoutMs = 8000,
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html") && !ct.includes("text/plain")) return null;
    const buf = await res.arrayBuffer();
    // cap at ~1MB
    return new TextDecoder().decode(buf.slice(0, 1_000_000));
  } catch {
    return null;
  }
}

/** Crude HTML → text. Good enough to feed an LLM; not a full parser. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000);
}

export function absoluteUrl(base: string, href: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

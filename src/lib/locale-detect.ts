// Decide which language to write an outreach email in, based on the prospect's
// country (from discovery) or their website TLD. Defaults to English.

const TLD_LANG: Record<string, string> = {
  fr: "French",
  be: "French",
  de: "German",
  at: "German",
  ch: "German",
  es: "Spanish",
  mx: "Spanish",
  it: "Italian",
  nl: "Dutch",
  pt: "Portuguese",
  br: "Portuguese",
  ae: "Arabic",
  sa: "Arabic",
  eg: "Arabic",
  ma: "Arabic",
};

// Language is decided primarily from the website TLD (reliable: .fr → French).
// The discovery search-region (geo) is NOT used — searching "<query> France"
// often returns US/global companies, so it would mislabel the language.
export function detectLanguage(_geo?: string | null, domain?: string | null): string {
  if (domain) {
    const tld = domain.split(".").pop()?.toLowerCase();
    if (tld && TLD_LANG[tld]) return TLD_LANG[tld];
  }
  return "English";
}

// Action-oriented CTA button labels per language (lifts click-through vs. a
// bare product name). Falls back to English.
const CTA_LABEL: Record<string, string> = {
  English: "See how it works →",
  French: "Voir comment ça marche →",
  German: "Mehr erfahren →",
  Spanish: "Descúbrelo →",
  Italian: "Scopri di più →",
  Dutch: "Ontdek meer →",
  Portuguese: "Saiba mais →",
  Arabic: "اكتشف المزيد ←",
};

export function ctaLabel(language: string): string {
  return CTA_LABEL[language] || CTA_LABEL.English;
}

// High-value markets to spread discovery across when a campaign sets none.
export const DEFAULT_GEOS = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "France",
  "Germany",
  "Spain",
  "United Arab Emirates",
];

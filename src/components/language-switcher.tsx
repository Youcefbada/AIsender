"use client";

import { useI18n } from "./i18n-provider";

// Toggles the `locale` cookie and reloads so server components re-render in the
// chosen language (and <html dir> flips for RTL).
export function LanguageSwitcher() {
  const { locale } = useI18n();

  function setLocale(next: "en" | "ar") {
    if (next === locale) return;
    document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }

  return (
    <div className="inline-flex overflow-hidden rounded-md border text-xs" style={{ borderColor: "var(--border)" }}>
      <button
        onClick={() => setLocale("en")}
        className={`px-2 py-1 ${locale === "en" ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : ""}`}
      >
        EN
      </button>
      <button
        onClick={() => setLocale("ar")}
        className={`px-2 py-1 ${locale === "ar" ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : ""}`}
      >
        ع
      </button>
    </div>
  );
}

"use client";

import { createContext, useContext } from "react";
import type { Dict, Locale } from "@/lib/i18n/dictionaries";

interface I18nValue {
  locale: Locale;
  t: Dict;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dict;
  children: React.ReactNode;
}) {
  return <I18nContext.Provider value={{ locale, t: dict }}>{children}</I18nContext.Provider>;
}

/** Client-component hook: const { t, locale } = useI18n(); */
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}

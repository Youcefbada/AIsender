import { cookies } from "next/headers";
import { dictionaries, type Dict, type Locale } from "./dictionaries";

// Server-side locale resolution from the `locale` cookie (default English).
// Use in server components: const { t, locale, dir } = await getI18n();

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get("locale")?.value === "ar" ? "ar" : "en";
}

export async function getI18n(): Promise<{ locale: Locale; dir: "rtl" | "ltr"; t: Dict }> {
  const locale = await getLocale();
  return {
    locale,
    dir: locale === "ar" ? "rtl" : "ltr",
    t: dictionaries[locale] as unknown as Dict,
  };
}

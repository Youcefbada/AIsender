import type { Metadata } from "next";
import "./globals.css";
import { getI18n } from "@/lib/i18n/server";
import { I18nProvider } from "@/components/i18n-provider";

export const metadata: Metadata = {
  title: "AIToolSender — AI lead discovery & personalized outreach",
  description:
    "Find the highest-quality prospects for your product and send genuinely personalized outreach. Quality over quantity.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, dir, t } = await getI18n();
  return (
    <html lang={locale} dir={dir}>
      <body className="min-h-screen antialiased">
        <I18nProvider locale={locale} dict={t}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}

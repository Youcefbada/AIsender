import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function Home() {
  const { t } = await getI18n();
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <div className="mb-6 flex items-center justify-between">
        <div
          className="inline-flex items-center rounded-full border px-3 py-1 text-xs text-[var(--muted-foreground)]"
          style={{ borderColor: "var(--border)" }}
        >
          {t.landing.badge}
        </div>
        <LanguageSwitcher />
      </div>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
        {t.landing.title}
      </h1>
      <p className="mt-5 text-lg text-[var(--muted-foreground)]">{t.landing.subtitle}</p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/dashboard"
          className="rounded-md px-5 py-2.5 text-sm font-medium text-[var(--primary-foreground)]"
          style={{ background: "var(--primary)" }}
        >
          {t.landing.openDashboard}
        </Link>
        <Link
          href="/login"
          className="rounded-md border px-5 py-2.5 text-sm font-medium"
          style={{ borderColor: "var(--border)" }}
        >
          {t.landing.signIn}
        </Link>
      </div>

      <ol className="mt-16 grid gap-4 sm:grid-cols-2">
        {t.landing.steps.map(([title, body]) => (
          <li key={title} className="rounded-lg border p-4" style={{ borderColor: "var(--border)" }}>
            <div className="font-medium">{title}</div>
            <div className="mt-1 text-sm text-[var(--muted-foreground)]">{body}</div>
          </li>
        ))}
      </ol>
    </main>
  );
}

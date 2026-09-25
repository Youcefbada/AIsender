import Link from "next/link";
import { signOut } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { LanguageSwitcher } from "./language-switcher";

export async function Nav() {
  const { t } = await getI18n();
  const links: [string, string][] = [
    ["/dashboard", t.nav.dashboard],
    ["/opportunities", t.nav.opportunities],
    ["/products", t.nav.products],
    ["/campaigns", t.nav.campaigns],
    ["/leads", t.nav.leads],
    ["/emails", t.nav.approvals],
    ["/settings", t.nav.settings],
  ];

  return (
    <header className="border-b" style={{ borderColor: "var(--border)" }}>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold">
            AIToolSender
          </Link>
          <nav className="hidden gap-4 text-sm text-[var(--muted-foreground)] sm:flex">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="hover:text-[var(--foreground)]">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              {t.nav.signOut}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

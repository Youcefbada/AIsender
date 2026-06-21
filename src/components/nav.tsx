import Link from "next/link";
import { signOut } from "@/lib/auth";

const links = [
  ["/dashboard", "Dashboard"],
  ["/products", "Products"],
  ["/campaigns", "Campaigns"],
  ["/leads", "Leads"],
  ["/emails", "Approvals"],
  ["/settings", "Settings"],
];

export function Nav() {
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
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}

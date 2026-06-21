import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs text-[var(--muted-foreground)]"
           style={{ borderColor: "var(--border)" }}>
        Quality over quantity · 10–30 prospects/day
      </div>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
        AI lead discovery &amp; truly personalized outreach
      </h1>
      <p className="mt-5 text-lg text-[var(--muted-foreground)]">
        Submit a product. The agent analyzes it, builds your ideal customer
        profiles, finds and scores the most relevant businesses, researches each
        one, and drafts handcrafted emails — then holds them for your one-click
        approval. No spam. No bulk blasting.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/dashboard"
          className="rounded-md px-5 py-2.5 text-sm font-medium text-[var(--primary-foreground)]"
          style={{ background: "var(--primary)" }}
        >
          Open dashboard
        </Link>
        <Link
          href="/login"
          className="rounded-md border px-5 py-2.5 text-sm font-medium"
          style={{ borderColor: "var(--border)" }}
        >
          Sign in
        </Link>
      </div>

      <ol className="mt-16 grid gap-4 sm:grid-cols-2">
        {[
          ["1 · Analyze", "AI reads the product and derives ICPs, personas, and outreach angles."],
          ["2 · Discover", "Targeted search for the businesses most likely to buy — never random."],
          ["3 · Score", "0–100 scoring engine; only leads above your threshold proceed."],
          ["4 · Research", "Per-prospect research builds the hooks that make emails feel handcrafted."],
          ["5 · Draft", "Unique subject + body + follow-up sequence per prospect."],
          ["6 · Approve & send", "Throttled, windowed sending with full open/click/reply tracking."],
        ].map(([title, body]) => (
          <li key={title} className="rounded-lg border p-4" style={{ borderColor: "var(--border)" }}>
            <div className="font-medium">{title}</div>
            <div className="mt-1 text-sm text-[var(--muted-foreground)]">{body}</div>
          </li>
        ))}
      </ol>
    </main>
  );
}

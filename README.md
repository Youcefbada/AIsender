# AIToolSender

AI-powered lead discovery and **personalized** outreach. Submit a product; the
system analyzes it, builds ideal customer profiles, finds and scores the most
relevant businesses, researches each one, drafts genuinely handcrafted emails,
and (after your one-click approval) sends them — throttled to **10–30 high-quality
prospects per day**. Quality over quantity. Not a spam tool.

## Why the human-approval gate (a deliberate change to the spec)

The original brief asked for fully autonomous "discover → find email → send at
midnight." Building it exactly that way is the fastest path to a burned sending
domain and CAN-SPAM/GDPR exposure. So the autonomous agent does **everything up
to sending** overnight and leaves a batch of `PENDING_APPROVAL` emails. You
review and approve in one click; sending is then paced inside a daily limit and
a send window. You can flip `campaign.autoSend = true` per campaign once a domain
is warmed and you accept the risk.

## Stack

Next.js 15 (App Router) · TypeScript · TailwindCSS v4 · shadcn-style UI ·
PostgreSQL · Prisma · NextAuth v5 · Resend + Brevo/SMTP fallback · free LLMs via
Gemini → Groq → OpenRouter (automatic cross-provider fallback) · Serper.dev
discovery. Built to deploy on Hostinger Business at ~$0/month.

## Quick start

```bash
cp .env.example .env        # fill DATABASE_URL (PostgreSQL), AUTH_SECRET, ENCRYPTION_KEY, GEMINI_API_KEY, RESEND_API_KEY
npm install
npm run db:push             # create schema in your PostgreSQL database
npm run dev                 # http://localhost:3000
```

Deploying to **Hostinger Business** (Node.js, PostgreSQL, free APIs)? See
[`docs/DEPLOY-HOSTINGER.md`](docs/DEPLOY-HOSTINGER.md).

Generate the two required secrets:

```bash
openssl rand -base64 32     # AUTH_SECRET
openssl rand -base64 32     # ENCRYPTION_KEY (must decode to 32 bytes)
```

## The pipeline (8 steps)

| Step | What | Code |
|---|---|---|
| 1 Analyze | Product → summary, ICPs, personas, angles | `src/services/analyze-product.ts` |
| 2 Discover | Targeted search for matching businesses | `src/lib/discovery/provider.ts` |
| 3 Score | 0–100 capped scoring, AI + deterministic clamps | `src/lib/scoring.ts` |
| 4 Contacts | Public contact data + email validation | `src/lib/email/validate.ts` |
| 5 Research | Per-prospect hooks for personalization | (pipeline stage) |
| 6 Draft | Unique subject/body/follow-ups | `src/lib/ai/prompts.ts` |
| 7 Send | Queue, window, throttle, tracking, compliance | `src/agent/dispatch.ts` |
| 8 Dashboard | Products, leads, scores, rates | `src/app/dashboard` |

Nightly agent: `src/agent/run.ts` → `src/agent/pipeline.ts`.
Trigger via cron hitting `POST /api/agent/run` (bearer `CRON_SECRET`).

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full design, decisions,
and tradeoffs, and [`docs/ROADMAP.md`](docs/ROADMAP.md) for MVP → scale → cost.

## Compliance is built in, not bolted on

Every send carries a physical mailing address, a working one-click unsubscribe
(`List-Unsubscribe` headers + footer link), and respects a per-user suppression
list. Only publicly available business contact data should be ingested; respect
each discovery source's robots.txt and ToS.

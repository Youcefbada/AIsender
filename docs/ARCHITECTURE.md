# Architecture

This document covers deliverables 1–5: system architecture, database schema,
folder structure, API design, and UI wireframes — with the *why*, the
alternatives, and the tradeoffs for each major decision.

---

## 1. System architecture

```
                 ┌──────────────────────────────────────────────┐
                 │                Next.js 15 app                  │
                 │                                                │
  Browser  ───▶  │  App Router (RSC)        API Route Handlers    │
                 │  /dashboard  /login      /api/products         │
                 │  /products   /campaigns  /api/campaigns        │
                 │  /leads      /emails      /api/agent/run        │
                 │                          /api/track /unsubscribe│
                 └───────┬───────────────────────┬───────────────┘
                         │                        │
            ┌────────────▼─────────┐   ┌──────────▼───────────┐
            │   Service layer       │   │   Agent pipeline      │
            │  analyze-product      │   │  discover→score→draft │
            │  score-lead           │   │  (src/agent)          │
            │  generate-email       │   └──────────┬───────────┘
            └────────────┬─────────┘              │
                         │                         │
       ┌─────────────────▼─────────────────────────▼───────────┐
       │                    lib (shared core)                    │
       │  ai/openrouter  scoring  email/{send,validate,compliance}│
       │  discovery/provider  crypto  ratelimit  db  auth         │
       └───────┬───────────────┬───────────────┬─────────────────┘
               │               │               │
        ┌──────▼─────┐  ┌──────▼─────┐  ┌──────▼──────┐
        │ PostgreSQL │  │ OpenRouter │  │ Resend/SMTP │
        │  (Prisma)  │  │  (LLMs)    │  │  (delivery) │
        └────────────┘  └────────────┘  └─────────────┘
```

**Why a Next.js monolith (not microservices).** One deployable, shared types
end-to-end, trivial to run on Hostinger Business shared hosting, and the whole
team reasons about one codebase. The agent is just code in `src/agent` invoked by
a cron-hit API route. *Alternative:* a separate worker service + queue (BullMQ/
Redis). *Tradeoff:* more robust at scale but overkill for 10–30 emails/day/user
and incompatible with cheap shared hosting. We keep the **service/agent layers
free of HTTP concerns** so extracting a worker later is mechanical (see ROADMAP).

**Why a service layer between routes and lib.** Routes stay thin (auth + validate
+ call service); business logic is testable without HTTP; the agent reuses the
exact same services as the UI. *Alternative:* logic inside route handlers.
*Tradeoff:* a little more indirection now, far less duplication later.

**Provider abstractions for the two volatile, risky concerns** — LLM and lead
discovery. Models change weekly and discovery has ToS/legal nuance, so both sit
behind interfaces (`ai/models.ts`, `discovery/provider.ts`). Swap a model or a
data source via config, never via a rewrite.

---

## 2. Database schema

Full schema in [`prisma/schema.prisma`](../prisma/schema.prisma). Entity groups:

- **Auth**: `User`, `Account`, `Session`, `VerificationToken`, `ApiKey` (encrypted).
- **Product**: `Product` → `ProductAnalysis` (1:1, latest) → `Icp` (1:many).
- **Campaign**: `Campaign` (guardrails: dailyLimit, minScore, autoSend, window) →
  `SequenceStep`.
- **Lead funnel**: `Lead` (status machine) → `Contact`, `LeadScore` (1:1),
  `ProspectResearch` (1:1).
- **Outreach**: `SenderIdentity`, `EmailMessage` (status machine + tracking),
  `EmailEvent` (append-only), `Suppression`.
- **Ops**: `CampaignMetric` (daily rollup), `UsageCounter` (quota), `AuditLog`,
  `AgentRun`.

**Key modeling decisions:**

- **`Lead` is the funnel spine** with an explicit `LeadStatus` enum
  (DISCOVERED→SCORED→QUALIFIED→…→CONTACTED→REPLIED→CONVERTED). One column tells
  you exactly where any prospect sits and makes pipeline stages idempotent.
- **Dedup via `@@unique([userId, domain])`.** A normalized domain is the natural
  business key; prevents re-emailing the same company. *Tradeoff:* leads without a
  resolvable domain take a non-unique create path (handled in the pipeline).
- **Scores stored per-dimension, not just a total** (`LeadScore`). Explainability
  for the user and re-tuning without re-querying the LLM.
- **`Suppression` is global per user** and checked at *both* draft time and the
  last instant before send — defense in depth against ever mailing an opt-out.
- **`UsageCounter` for quotas, not in-memory** — survives serverless cold starts
  and multiple instances. Day-window keys.
- **Secrets encrypted at rest** (`ApiKey` holds ciphertext/iv/authTag,
  AES-256-GCM via `lib/crypto.ts`). Never store provider keys in plaintext.
- **`EmailEvent` append-only** mirrors provider webhooks; `EmailMessage` carries
  denormalized latest-state columns (openedAt, repliedAt…) for fast dashboards.
  *Tradeoff:* slight duplication, big read-performance win.

*Alternative considered:* a single polymorphic `Activity` table instead of typed
funnel tables. Rejected — typed relations give compile-time safety and clean
joins for the dashboard.

---

## 3. Folder structure

```
src/
  app/
    page.tsx                 # marketing/landing
    layout.tsx  globals.css
    (auth)/login/            # NextAuth sign-in
    dashboard/               # metrics overview (STEP 8)
    products/                # create + analyze
    campaigns/  leads/  emails/   # approval queue lives here
    api/
      products/route.ts                 products/[id]/analyze/route.ts
      campaigns/route.ts                emails/[id]/approve/route.ts
      agent/run/route.ts                # cron entry
      track/open/[token]/route.ts       track/click/[token]/route.ts
      unsubscribe/[token]/route.ts
      webhooks/resend/route.ts          # delivery/open/bounce/complaint
      auth/[...nextauth]/route.ts
  agent/
    run.ts        # iterate active campaigns (cron CLI + API)
    pipeline.ts   # discover→score→qualify→contact→draft
    dispatch.ts   # send-queue worker (window + throttle + compliance)
  services/
    analyze-product.ts   score-lead.ts   generate-email.ts
  lib/
    ai/{openrouter,models,prompts}.ts
    email/{send,validate,compliance}.ts
    discovery/provider.ts
    db.ts auth.ts crypto.ts ratelimit.ts utils.ts
    validation/schemas.ts
  components/ui/   # shadcn-style primitives
prisma/schema.prisma
docs/
```

**Why `agent/`, `services/`, `lib/` split.** `lib` = pure reusable utilities;
`services` = DB+AI orchestration for one business op; `agent` = long-running
multi-step batch flows. Clear ownership, clear test seams.

---

## 4. API design

REST-ish route handlers, all behind NextAuth (except cron/webhook/tracking which
use signed tokens / bearer secrets). Every mutation: **auth → zod validate →
ownership check → service call → audit log**.

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/api/products` | list / create product |
| POST | `/api/products/:id/analyze` | run STEP 1 |
| GET/POST | `/api/campaigns` | list / create campaign |
| POST | `/api/campaigns/:id/run` | trigger pipeline now (manual) |
| GET | `/api/leads` | list leads (filter by status/score) |
| POST | `/api/emails/:id/approve` | approval gate → APPROVED |
| POST | `/api/emails/:id/cancel` | drop a draft |
| POST | `/api/agent/run` | cron: run all active campaigns (bearer) |
| POST | `/api/agent/dispatch` | cron: flush due send-queue (bearer) |
| GET | `/api/track/open/:token.png` | open pixel (signed) |
| GET | `/api/track/click/:token` | click redirect (signed) |
| GET/POST | `/api/unsubscribe/:token` | one-click unsub (signed) |
| POST | `/api/webhooks/resend` | delivery/bounce/complaint events |

**Why signed tokens for tracking/unsubscribe** (`lib/email/compliance.ts`,
HMAC): these endpoints are unauthenticated by necessity (clicked from an inbox),
so the token both identifies the email and proves we issued the link — no forging
opens or unsubscribing arbitrary addresses.

**Why bearer-secret cron, not Vercel-cron-only:** keeps us host-agnostic
(Hostinger cron, VPS systemd timer, or any scheduler can POST the URL).

---

## 5. UI wireframes

```
┌─ Dashboard ───────────────────────────────────────────────┐
│  [Sent 18] [Open 42%] [Click 11%] [Reply 7%] [Conv 2]      │
│  ┌── Approval queue (5 waiting) ───────────────────────┐   │
│  │  Acme Co · score 88 · "Quick idea for your SEO …"   │   │
│  │     subject + body preview      [Edit][Approve][✕]  │   │
│  └─────────────────────────────────────────────────────┘   │
│  Funnel:  Discovered 64 → Qualified 21 → Drafted 18 → Sent  │
└────────────────────────────────────────────────────────────┘

┌─ New Product ──────────┐   ┌─ Lead detail ───────────────┐
│ name   [           ]   │   │ Acme Co   score 88          │
│ url    [           ]   │   │  industry +28 painpoint +24 │
│ aff.   [           ]   │   │  website +9  social +12 …    │
│ desc   [           ]   │   │  Research hooks: ▢ ▢ ▢       │
│ notes  [           ]   │   │  Contact: jane@acme · VALID │
│          [Analyze ▶]   │   │  Draft email  [Approve]     │
└────────────────────────┘   └─────────────────────────────┘
```

**Why an approval-queue-first dashboard:** the daily human action *is* approval,
so it's the hero of the screen, not buried. Funnel counts make "quality over
quantity" visible at a glance.

See [`docs/ROADMAP.md`](ROADMAP.md) for deliverables 6–10 (roadmaps + cost).

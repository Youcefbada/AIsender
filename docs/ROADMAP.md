# Roadmap, scaling, and cost

Deliverables 6–10: development roadmap, MVP roadmap, scaling roadmap, cost
optimization, and free-tier strategy.

---

## 6 & 7. Development + MVP roadmap

**Phase 0 — Foundation (DONE in this repo)**
Schema, scaffold, AI client w/ fallback, scoring engine, email send + validate +
compliance, rate limiting, encryption, agent pipeline + dispatch skeletons, core
API routes, docs.

**Phase 1 — MVP (ship this first, ~1–2 weeks)**
1. Auth flow working end-to-end (`/login`, Google or email magic link).
2. Product CRUD UI + "Analyze" wired to `/api/products/:id/analyze`.
3. Show ICPs/personas/angles; let user pick one to seed a campaign.
4. **Manual lead import (CSV)** as the first discovery provider — ship value
   before building scraping. Validate the whole funnel with real data.
5. Scoring runs on import; leads list filterable by score/status.
6. Email drafting + the **approval queue** + manual send.
7. Open/click/unsubscribe tracking + suppression enforcement.

> MVP deliberately defers automated discovery. The funnel, scoring,
> personalization, compliance, and deliverability are the hard, defensible parts;
> a CSV import proves them at zero ToS risk.

**Phase 2 — Automation (~2–3 weeks)**
8. A real discovery provider behind `DiscoveryProvider` (Google CSE / SerpAPI /
   Bing Web Search — pick by cost; all have free tiers/credits).
9. Contact discovery (parse public contact pages; optional Hunter.io free tier).
10. Per-prospect `ProspectResearch` stage feeding personalization hooks.
11. Nightly cron → `agent/run` → drafts to approval queue.
12. Send-queue cron → `agent/dispatch` with window + throttle.
13. Follow-up sequences (`SequenceStep`) + reply detection (stop-on-reply).

**Phase 3 — Growth & quality loop (ongoing)**
14. A/B subject lines; learn which angles/ICPs convert and re-weight scoring.
15. Domain warmup automation (escalating `SenderIdentity.warmupStage`).
16. Deliverability dashboard (bounce/complaint rates, SPF/DKIM/DMARC checks).
17. Multi-sender rotation to spread volume.

---

## 8. Scaling roadmap

| Bottleneck | At small scale | At scale | Migration |
|---|---|---|---|
| Background work | cron → API route | dedicated worker running `agent:run`/`dispatch` | logic already in `src/agent`, host-agnostic — just run it as a process |
| Queue | DB-polled (`EmailMessage.status`) | Redis + BullMQ | swap `dispatch.ts` internals; status columns stay |
| DB | Hostinger/Neon Postgres | managed Postgres + read replica | Prisma connection string only |
| LLM cost/latency | OpenRouter free models | batch + cache + cheaper routing | `ai/models.ts` is the one switch point |
| Hosting | Hostinger Business (shared) | VPS / container (Docker) | standard Next.js standalone build |

The **VPS migration is intentionally trivial**: nothing depends on a specific
host. Build a standalone Next.js output, run it under PM2/systemd, run the agent
as a second process, point cron/systemd-timer at it.

---

## 9. Cost optimization plan

- **Per-task model routing** (`ai/models.ts`): scoring uses the cheapest capable
  model; only drafting/analysis get the stronger one. Biggest single lever.
- **Score before you research before you draft.** Each stage gates the next, so
  expensive LLM calls only run on leads that survive the cheap filters. Drafting
  (the costly call) only touches qualified, contactable, non-suppressed leads.
- **Cache product analysis** (1:1, re-run only on demand) — not per-lead.
- **Cap everything** with `UsageCounter` (`ai:calls:day`, `emails:day`,
  `discovery:day`) so a bug or abuse can't run up a bill.
- **Daily volume is tiny by design** (10–30 emails). Even paid models cost cents/
  day per user; the constraint is quality, not spend.
- **DB-polled queue** avoids paying for Redis until volume justifies it.

Rough monthly cost at MVP scale (1 user, 30/day): OpenRouter free/near-free,
Resend free tier (3k/mo, 100/day) covers it, Postgres free tier (Neon/Supabase),
Hostinger you already pay for → **~$0 marginal**.

## 10. Free-tier optimization strategy

| Service | Free tier | How we stay inside it |
|---|---|---|
| OpenRouter | free DeepSeek/Qwen/Llama models | default to `:free` models; users can BYO key |
| Resend | 100/day, 3k/mo | daily limit 10–30 keeps us well under |
| Postgres | Neon/Supabase free tier | tiny row counts; daily metric rollups not raw logs |
| Discovery | Google CSE 100 q/day, SerpAPI free credits, Hunter free | over-discover ×4 then filter; cache results |
| Hosting | Hostinger Business (already owned) | monolith, no extra infra |
| Email validation | $0 — DNS MX check only (`email/validate.ts`) | no paid verification API needed |

**BYO-key option**: store each user's own OpenRouter/Resend keys (encrypted) so
heavy users pay their own usage and your platform cost stays flat — built into the
`ApiKey` model from day one.

---

## Implemented (this repo — MVP complete)

- **Full UI**: dashboard, products (create + analyze + ICP view), campaigns
  (create + run + leads), leads (+ CSV import), approval queue (approve/cancel),
  settings (sender identities). Auth via Google OR email magic-link.
- **Discovery**: Google CSE provider (`lib/discovery/google-cse.ts`, env-gated)
  + CSV import path (`/api/leads/import`) for zero-ToS-risk ingestion.
- **Contact discovery**: real public-page email extraction
  (`lib/contact/find.ts`) with MX validation.
- **Research**: per-prospect site fetch + LLM hook extraction
  (`services/research-prospect.ts`).
- **Sending + tracking**: dispatch worker, open pixel, click redirect, one-click
  unsubscribe, and the Resend webhook (delivery/open/click/bounce/complaint →
  suppression). All wired.

## Remaining hardening before production

- `dispatch.ts` send-window uses UTC; honor `Campaign.timezone` before go-live.
- **Verify the Resend webhook signature** (Svix) against `RESEND_WEBHOOK_SECRET`
  — currently a marked TODO in `/api/webhooks/resend`.
- Follow-up sequences (`SequenceStep`) are modeled but not yet generated/sent.
- Per-user encrypted API keys (`ApiKey` model + `lib/crypto.ts`) are ready; add
  the settings UI to capture them and pass to `chatComplete({ apiKey })`.
- Add tests for `scoring.normalizeScore`, `email/validate`, `crypto` round-trip,
  and `compliance` token sign/verify first — they're pure and high-value.

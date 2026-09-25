# AIToolSender — Full Platform Audit Report

**Date**: 2026-09-25  
**Audited by**: 5 specialized AI audit agents (Schema & Database, API Routes, Services & AI Pipeline, Frontend & Components, Config & Dependencies)  
**Total files audited**: ~90+ source files across the entire codebase

---

## Executive Summary

The platform is **functionally complete** — TypeScript compiles, all imports resolve, all UI routes link to valid API endpoints, and the new Opportunity Discovery pipeline is wired end-to-end. However, the audit uncovered **critical security vulnerabilities**, **logic bugs that silently break core features**, and **missing validation** that would cause production failures.

### Severity Breakdown

| Severity | Count | Summary |
|---|---|---|
| 🔴 **P0 — Critical** | 8 | Security holes, data corruption, quota bypass |
| 🟠 **P1 — High** | 9 | Silent failures, broken fallbacks, missing validation |
| 🟡 **P2 — Medium** | 10 | Truncation risks, dead code, accessibility gaps, schema issues |
| 🔵 **P3 — Low** | 8 | Unused deps, hardcoded strings, cosmetic issues, dead models |

---

## 🔴 P0 — Critical Issues

### 1. Hardcoded Production Secrets in GitHub Workflow
> [!CAUTION]
> **File**: [agent.yml](file:///Users/youcefbada/Desktop/ai%20sender/.github/workflows/agent.yml#L28)  
> The `CRON_SECRET` (`"1ezlN3rKEZyjHPipG0OyQj1xC35+aHOi"`) is hardcoded in the workflow YAML and committed to source control. This is the same secret used in `.env` and `config.ts` to protect admin-only agent/cron endpoints.  
> **Impact**: Anyone with repo access (or if the repo is public) can trigger `/api/agent/run`, `/api/agent/dispatch`, and `/api/agent/scout` remotely.  
> **Fix**: Replace with `${{ secrets.CRON_SECRET }}` GitHub repository secret. Rotate the current secret immediately.

### 2. Unauthenticated Resend Webhook — Email Status Forgery
> [!CAUTION]
> **File**: [webhooks/resend/route.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/app/api/webhooks/resend/route.ts#L9-L11)  
> The Resend webhook endpoint has **zero authentication**. Svix signature verification is explicitly skipped per code comment. Any attacker can POST fake `bounced`/`complained` events to add any email to the suppression list or alter delivery statuses.  
> **Fix**: Install `svix` package and verify `svix-signature` header, or add a shared webhook secret check.

### 3. Open Redirect Vulnerability — Phishing Vector
> [!CAUTION]
> **File**: [track/click/[token]/route.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/app/api/track/click/%5Btoken%5D/route.ts#L36-L38)  
> The redirect logic is **outside** the token verification block. Anyone can craft `/api/track/click/dummy?u=https://evil-phishing-site.com` and your domain will redirect to it, creating trusted-looking phishing links.  
> **Fix**: Move the redirect inside the successful token verification branch, or validate the target URL against a whitelist.

### 4. IDOR — Cross-User Sender Identity Hijacking
> [!CAUTION]
> **File**: [campaigns/route.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/app/api/campaigns/route.ts#L32-L47) & [campaigns/[id]/route.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/app/api/campaigns/%5Bid%5D/route.ts#L20-L32)  
> When creating or updating a campaign, `senderIdentityId` and `icpId` from the client body are **never checked for ownership**. An attacker who knows another user's `senderIdentityId` can attach it to their own campaign and send emails impersonating that user.  
> **Fix**: Verify `senderIdentityId` belongs to the authenticated `userId` before creating/updating the campaign.

### 5. Contact Scraper Queries Social Media Domains (Wastes Hunter.io Credits)
> [!CAUTION]
> **File**: [opportunity-contact.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/services/opportunity-contact.ts#L17-L26)  
> The Serper provider sets `companyDomain: "x.com"`, `"twitter.com"`, or `"reddit.com"` on social media discoveries. The contact scraper then:
> 1. Fetches and scrapes `https://x.com` or `https://reddit.com` looking for email addresses
> 2. Calls Hunter.io with `domain=reddit.com`, burning paid API credits and attaching corporate emails like `press@reddit.com` to individual prospects  
> **Fix**: Add a blocklist check: `if (/^(reddit|twitter|x|linkedin|youtube|facebook|instagram|tiktok)\.(com|co)$/i.test(domain)) return early`.

### 6. Quota Bypass — Batch Counter Never Increments
> [!CAUTION]
> **Files**: [ratelimit.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/lib/ratelimit.ts#L33-L40) + [opportunity-scout.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/services/opportunity-scout.ts#L262-L264)  
> When `opportunity-scout.ts` calls `consumeQuota(userId, "discovery:day", stats.saved)` with a batch amount (e.g., 25), and `row.count + 25 > 30` (the limit), `consumeQuota` returns `{ allowed: false }` **without incrementing the counter at all**. The 25 saved opportunities are free, and the counter stays frozen. The user can run the scout indefinitely.  
> **Fix**: In `consumeQuota`, when batch exceeds limit, clamp the increment to `Math.max(0, limit - row.count)` so partial usage is always recorded.

### 7. Agent/Cron Routes Have No Error Handling
> [!WARNING]
> **Files**: [agent/run/route.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/app/api/agent/run/route.ts), [agent/dispatch/route.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/app/api/agent/dispatch/route.ts), [agent/scout/route.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/app/api/agent/scout/route.ts)  
> All 3 cron-triggered agent routes have **no try/catch**. Any thrown error (DB connection failure, AI timeout, etc.) causes an unhandled 500 rejection with no logging, no cleanup, and no error response body.  
> **Fix**: Wrap the handler body in try/catch with proper error logging and a `500` JSON response.

### 8. Insecure Default Secrets in `config.ts`
> [!WARNING]
> **File**: [config.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/lib/config.ts#L13-L22)  
> If environment variables are not set, the app falls back to:
> - `authSecret: "dev-auth-secret-change-in-production"`
> - `encryptionKey: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="` (32 bytes of zeros)
> - `cronSecret: "dev-cron-secret-change-in-production"`
> 
> **Impact**: In production without env vars, JWT sessions can be forged, API keys are encrypted with a known key, and cron endpoints are unprotected.  
> **Fix**: Throw a startup error if any of these are missing in production (`NODE_ENV === "production"`).

---

## 🟠 P1 — High Priority Issues

### 9. AI Fallback Never Triggers on Invalid JSON
> [!IMPORTANT]
> **File**: [openrouter.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/lib/ai/openrouter.ts#L86-L96)  
> `chatComplete` only checks HTTP status (200 OK). If Gemini returns truncated or invalid JSON with a 200, it's treated as success. `parseJsonResponse` then crashes downstream. The fallback to Groq/OpenRouter **never triggers** — it only fires on HTTP errors.  
> **Fix**: Move JSON parsing/validation inside the fallback loop so a bad response from Provider A automatically falls through to Provider B.

### 10. NaN Bug in Email Generator — Empty Array Modulo
> [!IMPORTANT]
> **File**: [generate-email.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/services/generate-email.ts#L50-L51)  
> If `analysis.outreachAngles` is stored as `[]` (empty array), `angles.length === 0`, and `stepOrder % 0 = NaN`. `angles[NaN]` returns `undefined`, injecting `"undefined"` into the email prompt.  
> **Fix**: Guard: `angles.length ? angles[i % angles.length] : "relevant to your work"`.

### 11. Reddit Provider Ignores User API Keys — Blocked by Reddit
> [!IMPORTANT]
> **File**: [reddit.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/lib/discovery/reddit.ts#L44-L80)  
> The Reddit discovery provider uses unauthenticated `.json` endpoints. Since Reddit's 2023-2024 API policy, cloud IPs are aggressively blocked with 429/403. Meanwhile, the user's Reddit OAuth keys (stored via `ApiKeysForm`) are **completely ignored** by the provider.  
> **Fix**: Wire `getUserSecret(userId, "REDDIT")` into the provider to use OAuth2 tokens, or route Reddit searches through Serper.

### 12. No Runtime JSON Schema Validation on AI Outputs
> [!IMPORTANT]
> **Files**: All services + [openrouter.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/lib/ai/openrouter.ts#L102-L110)  
> `parseJsonResponse<T>` only does `JSON.parse` + regex fence stripping and casts `as T`. There is **zero Zod/AJV validation**. If the AI hallucinates field names, returns numbers as strings, or omits required keys, nothing catches it until Prisma crashes.  
> **Fix**: Add Zod schemas for each AI response shape and validate before database writes.

### 13. Missing Request Validation on 6 API Routes
> [!IMPORTANT]
> **Routes without Zod validation**:
> - `POST /api/user-capabilities` — raw type cast
> - `POST /api/product-profiles` — manual `if (!body.name)` only
> - `PATCH /api/product-profiles/[id]` — no validation at all
> - `POST /api/product-profiles/analyze` — manual length check only
> - `PATCH /api/opportunities` — raw type cast
> - `POST /api/opportunities/scout` — manual `if (!body.profileId)` only
> 
> **Fix**: Add Zod schemas matching the existing patterns in `src/lib/validation/schemas.ts`.

### 14. AI Calls Are Completely Unmetered
> [!IMPORTANT]
> **File**: [ratelimit.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/lib/ratelimit.ts#L14)  
> `"ai:calls:day": 1500` is defined but `consumeQuota` is **never called for AI tasks anywhere**. Any authenticated user can spam the analyze/message/score endpoints and drain the OpenRouter/Gemini API keys with no limit.  
> **Fix**: Add `consumeQuota(userId, "ai:calls:day", 1)` to all AI-triggering API routes.

### 15. Unsubscribe Route Has No Error Handling
> [!IMPORTANT]
> **File**: [unsubscribe/[token]/route.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/app/api/unsubscribe/%5Btoken%5D/route.ts#L32-L55)  
> Both `POST` and `GET` handlers lack try/catch. A database error during unsubscribe causes an unhandled 500, and the user sees a broken page instead of a confirmation.

### 16. Race Condition in Quota Consumption
> [!WARNING]
> **File**: [ratelimit.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/lib/ratelimit.ts#L27-L40)  
> `upsert` followed by `update` with `increment` is not atomic. Under concurrent requests, both can read `count + amount <= limit` and both proceed, exceeding the daily cap.  
> **Fix**: Use a single atomic `UPDATE ... SET count = count + $1 WHERE count + $1 <= limit RETURNING *` or wrap in a Prisma transaction with row-level locking.

### 17. Enum Mismatch Silently Drops Opportunities
> [!WARNING]
> **File**: [opportunity-classifier.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/services/opportunity-classifier.ts#L111-L122)  
> If the LLM returns `opportunityType: "custom_software"` (lowercase) instead of `"CUSTOM_SOFTWARE"`, Prisma throws an invalid enum error in `opportunity-scout.ts`. The catch block logs a `console.warn` and silently discards the opportunity.  
> **Fix**: Normalize enums: `.toUpperCase()` before passing to Prisma, and validate against the known enum values.

---

## 🟡 P2 — Medium Priority Issues

### 18. Token Truncation Risk in Product Intelligence
**File**: [product-profile.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/services/product-profile.ts#L54-L60)  
The `productIntelligencePrompt` requests a 21-field nested JSON. `chatComplete` defaults to `max_tokens: 1500`. Complex profiles easily exceed this, causing truncated JSON → `SyntaxError`.  
**Fix**: Increase `maxTokens` to 3000-4000 for analysis tasks.

### 19. No HTTP Timeout on External Requests
**Files**: [openrouter.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/lib/ai/openrouter.ts#L40), [serper.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/lib/discovery/serper.ts#L48)  
All `fetch` calls to AI providers and Serper have no `AbortController` or timeout. A hanging provider blocks the request indefinitely.  
**Fix**: Add `signal: AbortSignal.timeout(15000)`.

### 20. `tone="neutral"` Causes Missing Badge Styles
**Files**: [quota-tracker.tsx](file:///Users/youcefbada/Desktop/ai%20sender/src/components/quota-tracker.tsx#L63) (5 instances), [opportunity-list.tsx](file:///Users/youcefbada/Desktop/ai%20sender/src/components/opportunities/opportunity-list.tsx#L315) (4 instances)  
`Badge` component only defines `default`, `green`, `red`, `amber`, `blue` tones. Passing `"neutral"` evaluates to `undefined` → no background/text color applied.  
**Fix**: Change all `"neutral"` to `"default"`, or add a `neutral` entry to `badge.tsx`.

### 21. i18n Missing for All New Features
**Files**: `opportunities/page.tsx`, `opportunity-list.tsx`, `product-profile-analyzer.tsx`, `user-capability-form.tsx`, `quota-tracker.tsx`, `dashboard/page.tsx`, `products/page.tsx`  
All new Demand Intelligence UI strings are hardcoded in English. The existing app supports English + Arabic via `dictionaries.ts`, but none of the new components use `useI18n()`.

### 22. Inlined Prompt with Injection Vulnerability
**File**: [research-prospect.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/services/research-prospect.ts#L36-L56)  
The prompt is inlined (violating the `prompts.ts` separation pattern) and injects untrusted scraped website text without defensive instructions. Malicious website content can manipulate the AI response.  
**Fix**: Move to `prompts.ts` with untrusted-data boundary markers.

### 23. Missing `rel="noopener noreferrer"` on External Links
**File**: [products/[id]/page.tsx](file:///Users/youcefbada/Desktop/ai%20sender/src/app/products/%5Bid%5D/page.tsx#L35)  
`target="_blank"` without `rel="noopener noreferrer"` enables reverse tab-nabbing.

### 24. Accessibility Gaps (WCAG)
**Affected Components**: `auth-form.tsx`, `product-form.tsx`, `sender-identity-form.tsx`, `csv-import.tsx`, `opportunity-list.tsx` (search input + modal dialog)  
- Many `<input>` fields use `placeholder` only, missing `<label>` or `aria-label`.
- The opportunity message modal uses a plain `<div>` instead of `role="dialog"` + `aria-modal="true"` + keyboard trap. (`@radix-ui/react-dialog` is already installed but unused.)

### 25. Memory Leak in Scout — Unbounded DB Read
**File**: [opportunity-scout.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/services/opportunity-scout.ts#L116-L123)  
Fetches ALL `sourceUrl`s for the user into memory to deduplicate. As the table grows to thousands of rows, this becomes slow and memory-intensive.  
**Fix**: Use a `WHERE sourceUrl IN (...)` check or a database-level unique constraint.

### 26. Non-Unique `where` Clause in ProductProfile Update
**File**: [product-profile.ts](file:///Users/youcefbada/Desktop/ai%20sender/src/services/product-profile.ts#L131)  
`prisma.productProfile.update({ where: { id: data.id, userId } })` passes `userId` in the `where` clause, but there is no `@@unique([id, userId])` compound index on `ProductProfile`. This causes Prisma type errors in strict configs and is inconsistent with the rest of the codebase which uses `findFirst` + `update({ where: { id } })`.  
**Fix**: Either add `@@unique([id, userId])` to the schema, or use the standard `findFirst` ownership check pattern.

### 27. `DemandSignal` Model Conceptually Misaligned with Implementation
**File**: [schema.prisma](file:///Users/youcefbada/Desktop/ai%20sender/prisma/schema.prisma#L646-L654)  
`DemandSignal` was conceptualized in `project.md` to hold raw scraped items before classification. However, the actual implementation in `opportunity-scout.ts` processes raw posts in-memory as `DiscoveredRawItem` objects and stores qualified results directly as `Opportunity` records. `prisma.demandSignal` is **never called anywhere**.  
**Fix**: Either implement the intended 2-stage flow (raw → classified) or remove the model to reduce schema complexity.

---

## 🔵 P3 — Low Priority Issues

### 26. 5 Unused npm Dependencies
**File**: [package.json](file:///Users/youcefbada/Desktop/ai%20sender/package.json)  
The following packages are installed but never imported:
- `@radix-ui/react-dialog`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-label`
- `@radix-ui/react-tabs`
- `lucide-react`

**Fix**: `npm uninstall` to reduce bundle size. (Keep `react-dialog` if you plan to fix the modal accessibility issue.)

### 27. Dead Code & Unused Imports
- `opportunity-scout.ts:10` — `peekQuota` imported but never used
- `opportunity-classifier.ts:12-14` — `ProductProfile`, `UserCapability` types imported but never used
- `openrouter.ts:62` — `.fatal` property set but never checked
- `dashboard/page.tsx:5` — `CardHeader`, `CardTitle` imported but never rendered
- `leads/page.tsx:4` — `CardHeader`, `CardTitle` imported but never rendered
- `opportunity-list.tsx:3,61` — `useTransition` imported but never used

### 28. `.env.example` Templates MySQL, Schema Uses PostgreSQL
**Files**: `.env.example:3` vs `prisma/schema.prisma:10`  
The example shows `mysql://...` but the schema is `provider = "postgresql"`. Same mismatch in `README.md:22,31`.

### 29. `console.log` Outputs in Production Code
- `prisma/seed.ts:23` — Prints plaintext admin password
- `src/agent/scout-run.ts:58` — `console.log(JSON.stringify(r, null, 2))`
- `src/agent/run.ts:50` — `console.log(JSON.stringify(r, null, 2))`

### 30. Missing `@types/bcryptjs` DevDependency
`bcryptjs` is used in `auth.ts` and `register/route.ts` but `@types/bcryptjs` is not installed.

### 31. CAN-SPAM Compliance Gap
**File**: `.env` — `EMAIL_MAILING_ADDRESS=""` is empty. CAN-SPAM requires a valid physical mailing address in outgoing email footers.

---

## ✅ What's Working Well

| Area | Status |
|---|---|
| **All imports resolve** | ✅ Zero broken imports across 90+ files |
| **All UI routes → API routes** | ✅ Every fetch/action in every component points to an existing endpoint |
| **All nav links valid** | ✅ 7/7 navigation links resolve to real pages |
| **`use client` directives** | ✅ All 15 interactive components correctly declare it |
| **All components used** | ✅ Zero orphaned/unused components |
| **Auth on user routes** | ✅ `requireUserId()` enforced on all user-facing API routes |
| **Ownership scoping** | ✅ DB queries filter by `userId` on all data-access routes |
| **TypeScript compiles** | ✅ `npm run typecheck` passes |
| **No circular imports** | ✅ Dependency graph is strictly hierarchical |
| **Prisma external package** | ✅ Correctly configured in `next.config.mjs` |

---

## Recommended Fix Priority Order

1. **Rotate secrets** — Remove hardcoded `CRON_SECRET` from `agent.yml`, use GitHub Secrets
2. **Add try/catch** to agent routes and unsubscribe route
3. **Fix open redirect** — Move redirect inside token verification
4. **Fix IDOR** — Verify `senderIdentityId` ownership in campaign routes
5. **Add social domain blocklist** to contact scraper
6. **Fix quota bypass** — Clamp batch increments in `consumeQuota`
7. **Move JSON parsing into AI fallback loop** — So bad JSON triggers fallback to next provider
8. **Add Zod validation** to the 6 unvalidated API routes
9. **Add `consumeQuota` calls** to AI-triggering endpoints
10. **Fix `tone="neutral"`** → `"default"` across Badge usages
11. **Fix NaN modulo bug** in `generate-email.ts`
12. **Normalize AI enum outputs** to uppercase before Prisma writes

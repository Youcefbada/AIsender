# Deploying AIToolSender on Hostinger Business (Node.js)

Runs entirely on **Hostinger Business** shared hosting with **free-tier APIs** —
target cost **$0/month** on top of your hosting plan.

## 0. What you need (all free)
- A Hostinger **Business** plan (Node.js deploys supported).
- A **Gemini API key** — https://aistudio.google.com/apikey (≈1,500 req/day free).
- A **Resend API key** + a verified sending domain — https://resend.com
  (free 100/day). *Optional:* a **Brevo** account for the SMTP fallback (300/day).
- *Optional:* a **Serper.dev** key for automated discovery (free 2,500/mo). Without
  it, use CSV lead import — no key required.

## 1. Create the MySQL database
hPanel → **Databases** → create a database + user, note host/name/user/password.
Build the URL:

```
DATABASE_URL="mysql://DB_USER:DB_PASSWORD@DB_HOST:3306/DB_NAME"
```

## 2. Deploy the app
hPanel → **Websites → Node.js → Get started**:
- Connect your **GitHub repo** (auto-deploy on push to `main`) — or upload a ZIP.
- **Node version:** 20 or 22 (Next 15 needs ≥ 18.18).
- **Build command:** `npm install && npm run build` (the `postinstall` +
  `build` scripts run `prisma generate`).
- **Start command:** `npm start` (Passenger sets `PORT`; `next start` honors it).

## 3. Environment variables
Set these in the Node.js app's **Environment variables** panel (see `.env.example`
for the full list). Minimum to go live:

```
DATABASE_URL=mysql://...
AUTH_SECRET=<openssl rand -base64 32>
ENCRYPTION_KEY=<openssl rand -base64 32>   # must decode to 32 bytes
GEMINI_API_KEY=...
RESEND_API_KEY=...
EMAIL_FROM=you@yourdomain.com
EMAIL_FROM_NAME=Your Name
EMAIL_MAILING_ADDRESS=Your physical address
APP_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
TRACKING_SECRET=<random>
CRON_SECRET=<random>
# optional: GROQ_API_KEY, OPENROUTER_API_KEY, SERPER_API_KEY, SMTP_* (Brevo)
```

## 4. Initialize the schema + admin login (once)
From a machine with the repo + the production `DATABASE_URL`:

```bash
npm run db:push     # creates all tables in the Hostinger MySQL DB
npm run db:seed     # creates the admin account (ADMIN_USERNAME / ADMIN_PASSWORD)
```

Then sign in at `/login`. Other people can self-register at `/signup`. Every user
adds their **own** free API keys under **Settings → API keys** (Gemini, Groq,
OpenRouter, Resend, Serper, SMTP) — keys are encrypted at rest and used only for
that user's campaigns. The env keys act as a system-wide fallback.

## 5. Schedule the agent (cron)
The agent is **chunked** — each call processes a small batch and returns fast, so
run it often. Use hPanel **Cron Jobs**, or a free external pinger
(cron-job.org / GitHub Actions). Both endpoints require the `CRON_SECRET` bearer.

```bash
# every ~10 min: discover → score → research → draft (into the approval queue)
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/agent/run

# every ~10 min: send approved emails (respects send window + daily limit)
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://yourdomain.com/api/agent/dispatch
```

If hPanel cron can't send headers, append the secret as a query param and read it
in the route, or use cron-job.org which supports custom headers.

## 6. Resend webhook (tracking)
In Resend, add a webhook → `https://yourdomain.com/api/webhooks/resend` for
delivered/opened/clicked/bounced/complained events. Bounces & complaints
auto-populate the suppression list. (Harden with Svix signature verification —
see the TODO in `src/app/api/webhooks/resend/route.ts`.)

## Notes & limits
- **Daily volume:** keep ≤ 50/day (the app's ceiling) and warm new domains slowly.
- **Inode limit** (≈600k/account): `node_modules` is large. If you approach the
  cap, enable Next.js `output: "standalone"` and deploy the slimmed tree, or prune
  other sites on the account.
- **Long runs:** never raise the per-tick batch sizes so high that a single
  `/api/agent/run` call exceeds the Passenger request timeout — increase cron
  *frequency* instead. Batch sizes live in `src/agent/run.ts` and `dispatch.ts`.
- **AI quota:** Gemini ~1,500/day is plenty for 50 leads × ~3 calls. If you hit it,
  the client auto-falls back to Groq, then OpenRouter.

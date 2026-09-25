# AIToolSender - Complete Architecture & Technical Documentation

This document provides a highly detailed, exhaustive technical overview of the AIToolSender project following its transformation into an **AI Software Demand & Opportunity Discovery Platform**. It maps every component, database model, API route, and background service to ensure full clarity of the codebase.

---

## 0. AI Context & Agent Directives (START HERE)

**⚠️ IF YOU ARE AN AI AGENT READING THIS, READ THIS SECTION FIRST ⚠️**

To save context window tokens and prevent architectural drift, adhere strictly to the following directives when modifying this codebase:

1. **System Objective**: This is a **Software Demand Discovery + Opportunity Intelligence** platform. The primary goal is NOT mass cold-email automation. It finds web signals (Reddit, etc.), uses LLMs to score them for relevance to the user's product, and drafts human-reviewed outreach messages.
2. **Strict Guidelines**:
   - **DO NOT rebuild the application from scratch.**
   - **DO NOT replace the existing architecture** (Next.js 15 App Router, Prisma, Tailwind) unnecessarily.
   - **Reuse existing functionality** wherever possible. Make incremental, production-quality changes.
   - **DO NOT add paid APIs** when a free/public/API-free alternative (like public JSON endpoints or basic scraping) can reasonably accomplish the task.
   - **Human-in-the-loop is mandatory**. Do not build fully autonomous email-sending loops. Ensure daily quotas (defined in `ratelimit.ts`) are respected.
3. **Database Rules**: The original Supabase database is dead. **DO NOT** attempt to run `npx prisma db push` or Prisma Studio unless the user confirms they have set a valid `DATABASE_URL` in their local `.env` file.
4. **AI Pipeline Rules**: AI logic lives in `src/lib/ai/` and `src/services/`. Always use strict JSON output schemas (via Zod or prompt constraints) when calling LLMs. Use cheap/fast models (Flash-Lite/8b) for binary filtering, and larger models (Flash/70b) for deep scoring.

---

## 1. Core Philosophy & Product Transformation

### 1.1 Previous State
- **Goal**: Mass cold-email automation based on imported lists.
- **Flaws**: Hardcoded database credentials, reliance on scraping without intelligence, potential spam risks, and lack of human-in-the-loop oversight.

### 1.2 New State
- **Goal**: **Software Demand Discovery + Opportunity Intelligence**.
- **Execution**: The platform actively searches the web (e.g., Reddit, forums) for users expressing pain points or asking for recommendations related to the software the user builds. It uses AI to score the relevance (0-100) and draft personalized, contextual outreach messages.
- **Safety**: Human-in-the-loop design. Emails are drafted, not automatically sent. Strict daily quotas (30 discoveries, 20 emails) prevent API abuse and spam.

---

## 2. Tech Stack & Technologies Used

This project utilizes a modern, edge-ready full-stack JavaScript/TypeScript architecture.

### 2.1 Core Frameworks & Languages
- **Next.js 15 (App Router)**: The core React framework used for both the frontend UI and the backend API routes. Leverages Server Components for performance and Client Components for interactivity.
- **TypeScript**: Strict typing across the entire codebase. Interfaces and Prisma generated types are shared seamlessly between the backend services and frontend components to ensure type safety.
- **Node.js**: The underlying runtime for the backend services and Next.js server.

### 2.2 Database & ORM
- **PostgreSQL**: The primary relational database used to store users, intelligence, and opportunities.
- **Prisma**: The next-generation TypeScript ORM used to interact with PostgreSQL. Provides type-safe database queries, schema migrations (`prisma/schema.prisma`), and data validation.

### 2.3 UI & Styling (Frontend)
- **Tailwind CSS**: Utility-first CSS framework used for all styling. Allows for rapid, responsive UI development without leaving the JSX.
- **Radix UI / shadcn/ui**: Unstyled, accessible component primitives used as the foundation for the complex UI elements (modals, forms, dropdowns).
- **Lucide React**: The icon library used throughout the dashboard and opportunity feeds.

### 2.4 AI & Integrations
- **OpenRouter API**: The primary gateway to multiple LLMs. Used to intelligently route requests to the best model for the job.
- **Gemini (Flash / Flash-Lite)** & **Groq (Llama 3 70b / 8b)**: The specific underlying LLMs used for fast classification and deep reasoning. 
- **Zod**: TypeScript-first schema validation. Used heavily to validate structured JSON responses returned by the AI models and to validate API request payloads.

### 2.5 Tooling & Code Quality
- **ESLint**: Linter for identifying and reporting on patterns in TypeScript/JavaScript.
- **Prettier**: Opinionated code formatter.
- **npm**: Package manager for dependency resolution.

---

## 2. Directory Structure & File Relationships

```text
ai sender/
├── .env                    # Local environment variables (replaces hardcoded secrets)
├── prisma/
│   └── schema.prisma       # Database models and relations
├── src/
│   ├── app/                # Next.js App Router UI and API routes
│   │   ├── api/            # Backend endpoints
│   │   ├── dashboard/      # Main UI dashboard
│   │   ├── opportunities/  # Discovery feed UI
│   │   ├── products/       # Product intelligence UI
│   │   └── settings/       # Capabilities & API keys UI
│   ├── components/         # Reusable React components
│   │   ├── forms/          # User input forms (Capabilities, API keys)
│   │   └── opportunities/  # Discovery UI components
│   ├── lib/                # Core utilities, configurations, and AI
│   │   ├── ai/             # LLM prompts, model configurations, router
│   │   ├── discovery/      # Web scrapers/API integrations (Reddit, Serper)
│   │   ├── config.ts       # Centralized env validation
│   │   ├── db.ts           # Prisma client singleton
│   │   └── ratelimit.ts    # Quota enforcement logic
│   └── services/           # Heavy backend business logic orchestration
│       ├── opportunity-classifier.ts # Multi-stage AI scoring
│       ├── opportunity-message.ts    # AI email drafting
│       ├── opportunity-scout.ts      # Automated discovery orchestration
│       └── product-profile.ts        # AI product intelligence generation
```

---

## 3. Database Schema (Prisma)

The PostgreSQL schema (`prisma/schema.prisma`) was significantly expanded to support the intelligence pipeline while preserving legacy models.

### 3.1 `User` and `UserCapability`
- **`User`**: Core account model. Modified to link to `UserCapability`.
- **`UserCapability`**:
  - `id` (String): Primary Key.
  - `userId` (String): Foreign Key to `User`.
  - `description` (String): Free-text description of what the user/agency builds (e.g., "Custom internal React dashboards for logistics companies").
  - `services` (String[]): Array of specific services (e.g., `["Web Development", "Data Pipelines"]`).

### 3.2 `ProductProfile`
Stores AI-generated intelligence derived from the `UserCapability`.
- `id` (String): Primary Key.
- `userId` (String): Foreign Key to `User`.
- `name` (String): The name of the product/service.
- `valueProposition` (String): AI-generated core value prop.
- `targetAudience` (String[]): Array of ideal customer profiles.
- `painPointsSolved` (String[]): What problems the software solves.
- `searchKeywords` (String[]): Keywords used by the Scout to search the web (e.g., "need dashboard logistics").

### 3.3 Discovery Models (`DemandSignal` & `Opportunity`)
- **`DemandSignal`**: Raw data fetched from providers (e.g., Reddit) before AI classification.
  - `id` (String): Primary Key.
  - `sourceId` (String): Unique ID from the platform (e.g., Reddit post ID) to prevent duplicates.
  - `platform` (String): Source platform (e.g., "reddit", "x").
  - `content` (String): The raw text of the post.
  - `url` (String): Link to the original post.
  - `status` (String): State of processing (`"pending"`, `"classified"`, `"discarded"`).
- **`Opportunity`**: A qualified lead generated from a `DemandSignal` that passed the AI filter.
  - `id` (String): Primary Key.
  - `signalId` (String): Foreign Key to `DemandSignal`.
  - `userId` (String): Foreign Key to `User`.
  - `score` (Int): AI-generated fit score (0-100).
  - `fitReason` (String): AI explanation of *why* this is a good lead.
  - `contactName`/`contactEmail`: Parsed contact details (if available).
  - `sourceUrl` (String): Direct link to engage.
  - `status` (String): Lifecycle state (`"new"`, `"contacted"`, `"rejected"`).

### 3.4 `SearchRun`
Tracks background job executions to enforce quotas.
- `id` (String): Primary Key.
- `userId` (String): Foreign Key to `User`.
- `status` (String): `"success"`, `"failed"`, `"running"`.
- `signalsFound` (Int): Number of raw signals scraped.
- `opportunitiesCreated` (Int): Number of signals that passed AI filtering.
- `provider` (String): Which provider was used.

---

## 4. Backend Services (Business Logic)

Located in `src/services/`. This is the core engine of the platform.

### 4.1 `opportunity-scout.ts`
**Purpose**: Orchestrates the daily automated search for leads.
**Flow**:
1. Fetches all active `ProductProfile` records.
2. Initializes discovery providers (e.g., `RedditDiscoveryProvider`).
3. Iterates through the `searchKeywords` of the product profile.
4. Provider fetches raw posts -> saves them as `DemandSignal` (status: `"pending"`).
5. Passes pending signals to the `OpportunityClassifier`.

### 4.2 `opportunity-classifier.ts`
**Purpose**: Determines if a raw web post is a good lead for the user. Uses a 3-Stage AI Pipeline to save costs and time.
- **Stage 1: Deterministic Filtering**: Drops posts that are too short (< 10 chars) or obviously spam based on regex.
- **Stage 2: Fast AI Classification (Relevance)**: Uses a very fast, cheap model (e.g., Gemini Flash-Lite or Groq Llama 8b). Asks: "Is this post expressing a problem that `[ProductProfile]` can solve?" Returns true/false.
- **Stage 3: Deep AI Scoring (Fit)**: For posts that pass Stage 2, uses a heavier model (e.g., Gemini Flash or Groq 70b). Outputs a strict JSON object with `score` (0-100) and `fitReason`. High-scoring posts (> 70) are saved as `Opportunity` records.

### 4.3 `product-profile.ts`
**Purpose**: Translates a messy human description of their agency/software into structured data.
- Takes `UserCapability.description`.
- Uses AI to generate `ProductProfile` (value prop, target audience, pain points, search keywords).
- Essential because raw user descriptions make terrible search queries.

### 4.4 `opportunity-message.ts`
**Purpose**: Generates highly personalized outreach drafts.
- Inputs: `Opportunity` (context of the user's problem) + `ProductProfile` (what we sell).
- Outputs: A polite, non-spammy, context-aware draft message explaining how our tool solves their specific problem mentioned in the source URL.

---

## 5. AI Architecture & Configuration

Located in `src/lib/ai/`. Designed for maximum reliability using fallback mechanisms.

### 5.1 `models.ts` & `openrouter.ts`
- **Fallback Router**: All AI calls go through a custom router that attempts completion across multiple providers. If OpenRouter is down or rate-limited, it falls back to direct Groq or Gemini API keys.
- **Task Buckets**:
  - `"analysis"` (Complex tasks like Product Profile generation): Uses larger models.
  - `"scoring"` (Binary filtering/fast classification): Uses fastest/cheapest models.
  - `"email"` (Drafting): Uses highly creative/instruction-following models.

### 5.2 `prompts.ts`
Contains strict system prompts and instructions for JSON-schema output.
- `opportunityClassifierPrompt`: Instructs the AI on how to read a forum post and determine relevance.
- `opportunityScorerPrompt`: Instructs the AI to output exactly `{ "score": 85, "reason": "..." }`.
- `productIntelligencePrompt`: Instructs the AI to break down a product into searchable traits.
- `opportunityMessagePrompt`: Instructs the AI on tone (professional, direct, helpful, non-spammy).

---

## 6. API Routes Layer

Located in `src/app/api/`. These bridge the Frontend UI to the Backend Services.

- **`GET /api/opportunities`**: Fetches the user's feed of discovered leads. Supports filtering by `status` (new/contacted) and sorting by `score`.
- **`POST /api/opportunities/[id]/message`**: Triggers `opportunity-message.ts` to draft an email for a specific lead.
- **`PATCH /api/opportunities/[id]/status`**: Updates the lead status (e.g., user clicked "Mark as Contacted" or "Reject").
- **`POST /api/product-profiles/generate`**: Takes user capability data, calls `product-profile.ts`, and saves the resulting intelligence to the DB.
- **`GET /api/product-profiles`**: Retrieves the current intelligence profile.
- **`POST /api/user-capabilities`**: Saves the user's core service offering.
- **`GET /api/usage`**: Returns the current quota usage (e.g., `12/30 Discoveries`, `5/20 Emails`).
- **`POST /api/scout/trigger`**: A secure endpoint (protected by `CRON_SECRET`) that kicks off the `opportunity-scout.ts` pipeline. Used by Vercel Cron or manual admin triggers.

---

## 7. Frontend User Interface

Located in `src/app/` and `src/components/`. Built with Next.js 15 App Router (Server & Client Components).

### 7.1 `/settings` (Configuration)
- **`UserCapabilityForm.tsx`**: Allows the user to type in exactly what software/services they sell.
- **`ApiKeysForm.tsx`**: Updated to store `OPENROUTER_API_KEY`, Reddit OAuth tokens, and email provider keys locally or in the DB.

### 7.2 `/products` (Intelligence Generation)
- **`ProductProfileAnalyzer.tsx`**: A rich UI component that displays the AI-generated target audience, pain points, and search keywords. Allows the user to manually edit keywords if the AI missed something.

### 7.3 `/opportunities` (The Core Feed)
- **`OpportunityList.tsx`**: The main interactive dashboard.
  - Displays leads as cards sorted by `score` (descending).
  - Shows the `fitReason` immediately so the user knows *why* this lead was flagged.
  - Provides a direct `Source URL` button to view the original Reddit/Twitter post.
  - "Draft Message" button opens a modal.
- **`MessageDraftModal.tsx`**: Displays the AI-generated outreach message. The user can edit the text before manually copying it or clicking "Send" (via their configured email provider).

### 7.4 `/dashboard` (Overview)
- **`QuotaTracker.tsx`**: A visual progress bar showing how close the user is to their daily limits (`MAX_DISCOVERIES_PER_DAY` and `MAX_EMAILS_PER_DAY`).

---

## 8. Discovery Providers (Scrapers/APIs)

Located in `src/lib/discovery/`.

### 8.1 `OpportunityDiscoveryProvider` (Interface)
A standardized TypeScript interface that any new data source must implement:
```typescript
interface OpportunityDiscoveryProvider {
  name: string;
  search(keyword: string, limit: number): Promise<DemandSignal[]>;
}
```

### 8.2 `RedditDiscoveryProvider`
- **Implementation**: Connects to Reddit. It searches subreddits related to the product's target audience for the `searchKeywords`.
- **Parsing**: Extracts the post title, selftext (body), URL, and author name. Normalizes this into a `DemandSignal` array.
- **Safety**: Uses standard JSON `.json` endpoints and respects rate limits.

---

## 9. Security & Quota Enforcement

### 9.1 Environment Variables Setup
Hardcoded strings in `config.ts` were removed. The system now strictly enforces the presence of:
- `DATABASE_URL`
- `OPENROUTER_API_KEY` (or equivalent fallback keys)
- `CRON_SECRET`

### 9.2 Rate Limiting (`src/lib/ratelimit.ts`)
To prevent runaway AI costs and protect against spam:
- **`MAX_DISCOVERIES_PER_DAY = 30`**: The Scout will stop processing new signals once 30 High-Fit Opportunities are generated in a 24-hour period.
- **`MAX_EMAILS_PER_DAY = 20`**: The UI blocks the generation of draft messages if the user exceeds 20 per day.
- Checked via `getUsageSummary(userId)` which queries the `SearchRun` and `Opportunity` tables for the current day's timestamp.

---

## 10. End-to-End Workflow Trace (Example)

1. **Setup**: The user goes to `/settings` and writes: *"I run an agency that builds custom Shopify apps for clothing brands."*
2. **Intelligence**: The user goes to `/products` and clicks "Generate". The AI (`product-profile.ts`) processes this and generates search keywords: `["shopify app slow", "need custom shopify features", "shopify clothing store problem"]`.
3. **Scouting**: The daily cron job triggers `/api/scout/trigger`. The `OpportunityScout` invokes the `RedditDiscoveryProvider` using the generated keywords.
4. **Extraction**: The provider finds a Reddit post in `r/shopify`: *"My clothing brand is growing but the standard inventory apps are too slow. We need something custom built."* This is saved as a `DemandSignal`.
5. **Classification**: The `OpportunityClassifier` reads the signal.
   - Stage 1: Length is good.
   - Stage 2 (Fast AI): Relevance = `true`.
   - Stage 3 (Deep AI): Score = `95`, Reason: *"The user explicitly states they are a clothing brand needing a custom Shopify app due to inventory app limitations, which directly matches your agency's core offering."*
6. **Persistence**: The signal is converted into an `Opportunity` and saved to the DB.
7. **Action**: The user logs in, sees the 95-score lead on the `/opportunities` dashboard, clicks "Draft Message", and the AI writes a highly specific outreach note referencing their inventory issues.

---

## 11. Testing & Local Setup Requirements

### 11.1 The Database Block
**Critical Note**: The original Supabase project URL hardcoded into this repository has been deleted/deactivated by the host (`tenant/user postgres.pkahtfqlcedraumcytiv not found`).

To run this project locally, you **must** supply your own PostgreSQL database.

### 11.2 Steps to Run
1. Create a PostgreSQL database (locally via Docker/Postgres.app, or remotely via Neon/Supabase).
2. Copy `.env.example` to `.env`.
3. Insert your database connection string into `DATABASE_URL`.
4. Insert your AI provider key into `OPENROUTER_API_KEY`.
5. Run `npm install` to install dependencies.
6. Run `npx prisma db push` to push the new schema (including `Opportunity`, `ProductProfile`, etc.) to your fresh database.
7. Run `npm run dev` to start the Next.js development server.
8. Navigate to `http://localhost:3000`.

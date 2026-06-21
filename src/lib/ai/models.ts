// Central model routing across FREE providers, cheapest-capable-first with
// cross-provider fallback. All providers are OpenAI-compatible, so the transport
// in openrouter.ts only needs a base URL + key per provider.
//
// Free tiers (June 2026): Gemini ~1,500 req/day (primary), Groq ~14ك/day,
// OpenRouter :free 50/day (last resort). Swap models here without touching logic.

export type AiTask = "analysis" | "scoring" | "email" | "research";

export type Provider = "gemini" | "groq" | "openrouter";

export interface ModelRef {
  provider: Provider;
  model: string;
}

export interface ProviderConfig {
  baseUrl: string;
  apiKey?: string;
}

export function providerConfig(provider: Provider): ProviderConfig {
  switch (provider) {
    case "gemini":
      return {
        baseUrl:
          process.env.GEMINI_BASE_URL ||
          "https://generativelanguage.googleapis.com/v1beta/openai",
        apiKey: process.env.GEMINI_API_KEY,
      };
    case "groq":
      return {
        baseUrl: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
        apiKey: process.env.GROQ_API_KEY,
      };
    case "openrouter":
      return {
        baseUrl:
          process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
      };
  }
}

// Ordered fallback chain per task. Strong reasoning for analysis/email; cheap &
// fast for scoring. Env overrides let you pin a specific model per task.
const ROUTES: Record<AiTask, ModelRef[]> = {
  analysis: [
    { provider: "gemini", model: process.env.MODEL_ANALYSIS || "gemini-2.0-flash" },
    { provider: "groq", model: "llama-3.3-70b-versatile" },
    { provider: "openrouter", model: "deepseek/deepseek-chat:free" },
  ],
  scoring: [
    { provider: "gemini", model: process.env.MODEL_SCORING || "gemini-2.0-flash-lite" },
    { provider: "groq", model: "llama-3.1-8b-instant" },
    { provider: "openrouter", model: "qwen/qwen-2.5-72b-instruct:free" },
  ],
  email: [
    { provider: "gemini", model: process.env.MODEL_EMAIL || "gemini-2.0-flash" },
    { provider: "groq", model: "llama-3.3-70b-versatile" },
    { provider: "openrouter", model: "deepseek/deepseek-chat:free" },
  ],
  research: [
    { provider: "gemini", model: process.env.MODEL_RESEARCH || "gemini-2.0-flash-lite" },
    { provider: "groq", model: "llama-3.3-70b-versatile" },
    { provider: "openrouter", model: "qwen/qwen-2.5-72b-instruct:free" },
  ],
};

/**
 * Routes for a task, keeping only providers that have a key — either the user's
 * own key (passed in) or the system/env key.
 */
export function routesFor(
  task: AiTask,
  userKeys?: Partial<Record<Provider, string>>,
): ModelRef[] {
  return ROUTES[task].filter(
    (r) => !!(userKeys?.[r.provider] || providerConfig(r.provider).apiKey),
  );
}

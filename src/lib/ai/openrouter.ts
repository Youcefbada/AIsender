import {
  routesFor,
  providerConfig,
  type AiTask,
  type ModelRef,
  type Provider,
} from "./models";

// OpenAI-compatible chat client spanning multiple FREE providers (Gemini, Groq,
// OpenRouter). Tries each configured provider/model in order until one succeeds —
// resilient to per-provider daily limits and transient outages.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionResult {
  model: string; // "provider:model" that actually answered
  content: string;
}

interface CompletionOptions {
  task: AiTask;
  messages: ChatMessage[];
  // Per-user keys (from Settings); each takes precedence over the system env key
  // for that provider. Providers the user hasn't set fall back to env.
  providerKeys?: Partial<Record<Provider, string>>;
  temperature?: number;
  jsonMode?: boolean;
  maxTokens?: number;
}

async function callOnce(
  ref: ModelRef,
  apiKey: string,
  baseUrl: string,
  opts: CompletionOptions,
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // OpenRouter attribution (ignored by other providers).
      "HTTP-Referer": process.env.OPENROUTER_APP_URL || "",
      "X-Title": process.env.OPENROUTER_APP_NAME || "AIToolSender",
    },
    body: JSON.stringify({
      model: ref.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 1500,
      ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`${ref.provider}:${ref.model} -> ${res.status}: ${text.slice(0, 300)}`);
    // auth errors won't recover by retrying the same provider
    (err as { fatal?: boolean }).fatal = res.status === 401 || res.status === 403;
    throw err;
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error(`${ref.provider}:${ref.model} returned empty content`);
  return content;
}

export async function chatComplete(
  opts: CompletionOptions,
): Promise<CompletionResult> {
  const attempts: ModelRef[] = routesFor(opts.task, opts.providerKeys);

  if (attempts.length === 0) {
    throw new Error(
      "No AI provider configured. Add a Gemini, Groq, or OpenRouter key in Settings, or set one in the environment.",
    );
  }

  let lastError: unknown;
  for (const ref of attempts) {
    const cfg = providerConfig(ref.provider);
    const apiKey = opts.providerKeys?.[ref.provider] || cfg.apiKey;
    if (!apiKey) continue;
    try {
      const content = await callOnce(ref, apiKey, cfg.baseUrl, opts);
      return { model: `${ref.provider}:${ref.model}`, content };
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`All providers failed for task "${opts.task}": ${String(lastError)}`);
}

/** Parse a JSON object out of a model response, tolerating code fences. */
export function parseJsonResponse<T>(raw: string): T {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end !== -1) s = s.slice(start, end + 1);
  return JSON.parse(s) as T;
}

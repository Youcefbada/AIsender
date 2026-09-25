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

import { z } from "zod";

export interface CompletionResult<T = any> {
  model: string; // "provider:model" that actually answered
  content: string;
  parsed?: T;
}

export interface CompletionOptions<T = any> {
  task: AiTask;
  messages: ChatMessage[];
  // Per-user keys (from Settings); each takes precedence over the system env key
  // for that provider. Providers the user hasn't set fall back to env.
  providerKeys?: Partial<Record<Provider, string>>;
  temperature?: number;
  jsonMode?: boolean;
  maxTokens?: number;
  schema?: z.ZodType<T>;
}

export function extractJsonString(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end !== -1) s = s.slice(start, end + 1);
  return s;
}

async function callOnce<T>(
  ref: ModelRef,
  apiKey: string,
  baseUrl: string,
  opts: CompletionOptions<T>,
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
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      model: ref.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 1500,
      ...(opts.jsonMode || opts.schema ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`${ref.provider}:${ref.model} -> ${res.status}: ${text.slice(0, 300)}`);
    throw err;
  }

  // A 200 with truncated/invalid JSON is still a provider failure — the caller's
  // fallback loop must treat it the same as an HTTP error.
  let data: { choices?: { message?: { content?: string } }[] };
  try {
    data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  } catch {
    throw new Error(`${ref.provider}:${ref.model} returned unparseable JSON`);
  }
  if (!data || !Array.isArray(data.choices) || data.choices.length === 0) {
    throw new Error(`${ref.provider}:${ref.model} returned unexpected response shape`);
  }
  const content = data.choices[0]?.message?.content?.trim();
  if (!content) throw new Error(`${ref.provider}:${ref.model} returned empty content`);
  return content;
}

export async function chatComplete<T = any>(
  opts: CompletionOptions<T>,
): Promise<CompletionResult<T>> {
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
      let parsed: any;
      if (opts.jsonMode || opts.schema) {
        const s = extractJsonString(content);
        try {
          const rawJson = JSON.parse(s);
          if (opts.schema) {
            const result = opts.schema.safeParse(rawJson);
            if (!result.success) {
              throw new Error(`JSON schema validation failed: ${result.error.message}`);
            }
            parsed = result.data;
          } else {
            parsed = rawJson;
          }
        } catch (parseErr) {
          throw new Error(`JSON parse or validation failed: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
        }
      }
      return { model: `${ref.provider}:${ref.model}`, content, parsed };
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`All providers failed for task "${opts.task}": ${String(lastError)}`);
}

/**
 * @deprecated Use opts.schema in chatComplete instead.
 */
export function parseJsonResponse<T>(
  raw: string,
  validator?: (data: unknown) => data is T,
): T {
  const s = extractJsonString(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(s);
  } catch {
    throw new Error(`Model response was not valid JSON (first 200 chars): ${s.slice(0, 200)}`);
  }
  if (validator && !validator(parsed)) {
    throw new Error("Model response failed JSON schema validation");
  }
  return parsed as T;
}

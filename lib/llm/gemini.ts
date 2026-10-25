import "server-only";

import { GoogleGenAI } from "@google/genai";

export interface LlmRequest {
  system: string;
  prompt: string;
  schemaText?: string;
  temperature?: number;
  timeoutMs?: number;
}

export interface LlmResponse {
  json: unknown;
  model: string;
}

export interface LlmClient {
  generateJson(req: LlmRequest): Promise<LlmResponse>;
}

export class LlmUnavailableError extends Error {
  constructor(message = "Gemini LLM is unavailable") {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

export class LlmTimeoutError extends Error {
  constructor(message = "Gemini LLM request timed out") {
    super(message);
    this.name = "LlmTimeoutError";
  }
}

export class LlmRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmRequestError";
  }
}

const MODEL_ENV_KEYS = ["GEMINI_MODEL_PRIMARY", "GEMINI_MODEL_FALLBACK"] as const;

function readModels(): string[] {
  const values = MODEL_ENV_KEYS.map((key) => process.env[key]).filter((value): value is string => Boolean(value && value.trim()));
  return [...new Set(values)];
}

function jitterMs(base: number): number {
  return base + Math.floor(Math.random() * 200);
}

function stripMarkdownJson(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

export class GeminiLlmClient implements LlmClient {
  private readonly models: string[];

  constructor() {
    this.models = readModels();
  }

  async generateJson(req: LlmRequest): Promise<LlmResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || this.models.length === 0) {
      throw new LlmUnavailableError("GEMINI_API_KEY or model chain missing");
    }

    if (!req.system?.trim() || !req.prompt?.trim()) {
      throw new LlmRequestError("system and prompt are required");
    }

    const startWall = Date.now();
    let lastError: unknown = null;
    const attemptsPerModel = 3;

    for (const model of this.models) {
      for (let attempt = 1; attempt <= attemptsPerModel; attempt += 1) {
        const attemptStart = Date.now();
        try {
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model,
            contents: `${req.system}\n\n${req.prompt}`,
            config: {
              temperature: req.temperature ?? 0.2,
              responseMimeType: "application/json",
            },
          });

          const text = response.text ?? "{}";
          const clean = stripMarkdownJson(text);
          const parsed = JSON.parse(clean);

          const latencyMs = Date.now() - attemptStart;
          console.log(JSON.stringify({ type: "llm_attempt", model, attempt, latencyMs, status: "ok" }));

          return { json: parsed, model };
        } catch (error) {
          const latencyMs = Date.now() - attemptStart;
          const message = String(error);
          const status = /429|503|timeout|timed out|JSON.parse|Unexpected token/i.test(message) ? "retryable" : "error";
          console.log(JSON.stringify({ type: "llm_attempt", model, attempt, latencyMs, status, message: "omitted" }));
          lastError = error;

          if (/401|403/i.test(message)) {
            throw new LlmUnavailableError(`Unauthorized Gemini model access for ${model}`);
          }
          if (/404|model not found|not found/i.test(message)) {
            break;
          }
          if (/400/i.test(message)) {
            break;
          }
          if (Date.now() - startWall > 25_000) {
            throw new LlmTimeoutError("Gemini wall-clock budget exceeded");
          }
          const shouldRetry = /429|503|timeout|timed out|JSON.parse|Unexpected token/i.test(message);
          if (shouldRetry && attempt < attemptsPerModel) {
            const delay = jitterMs(Math.min(500 * attempt, 2000));
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          if (attempt >= attemptsPerModel) {
            break;
          }
        }
      }
    }

    if (lastError) throw lastError;
    throw new LlmUnavailableError("All Gemini models failed");
  }
}

export const llmClient: LlmClient = new GeminiLlmClient();
export const createGeminiClient = (): LlmClient => new GeminiLlmClient();

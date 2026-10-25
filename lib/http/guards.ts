import "server-only";

import { z } from "zod";

export interface GuardOptions {
  bodyLimit?: number;
  windowMs?: number;
  maxRequests?: number;
  logger?: (...args: unknown[]) => void;
}

const rateLimiters = new Map<string, { windowStart: number; count: number }>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

function pruneRateLimiters(now: number): void {
  for (const [key, value] of rateLimiters.entries()) {
    if (now - value.windowStart > 60_000) {
      rateLimiters.delete(key);
    }
  }
}

export function withGuards<T>(
  schema: z.ZodType<T>,
  handler: (body: T, req: Request) => Promise<Response>,
  opts: GuardOptions = {}
): (req: Request) => Promise<Response> {
  const bodyLimit = opts.bodyLimit ?? 4 * 1024;
  const windowMs = opts.windowMs ?? 60_000;
  const maxRequests = opts.maxRequests ?? 20;
  const logger = opts.logger ?? (() => undefined);

  return async function guarded(req: Request): Promise<Response> {
    const ip = getClientIp(req);
    const now = Date.now();
    pruneRateLimiters(now);

    const entry = rateLimiters.get(ip) ?? { windowStart: now, count: 0 };
    if (now - entry.windowStart > windowMs) {
      entry.windowStart = now;
      entry.count = 0;
    }
    entry.count += 1;
    rateLimiters.set(ip, entry);

    if (entry.count > maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((windowMs - (now - entry.windowStart)) / 1000));
      return Response.json(
        { error: "rate_limited", message: "The scroll library is busy, using saved scrolls." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    try {
      const rawText = await req.text();
      if (rawText.length > bodyLimit) {
        return Response.json({ error: "request_too_large" }, { status: 413 });
      }

      if (!rawText) {
        return Response.json({ error: "invalid_json" }, { status: 400 });
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        return Response.json({ error: "invalid_json" }, { status: 400 });
      }

      const result = schema.safeParse(parsed);
      if (!result.success) {
        return Response.json({ error: "validation_error", issues: result.error.issues }, { status: 422 });
      }

      return await handler(result.data, req);
    } catch (error) {
      logger("guarded-handler-error", { error, ip });
      return Response.json({ error: "server_error" }, { status: 500 });
    }
  };
}

/**
 * Best effort only: the limiter is per warm serverless instance and may reset on cold starts.
 */
export const __rateLimiters = rateLimiters;

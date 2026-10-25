"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { getRealm, stageSpec } from "@/data/curriculum";
import { getSeedLoaderForSubSkill } from "@/lib/client/seedLoaders";
import { VerifiedQuestionSchema, type VerifiedQuestion } from "@/lib/schemas";

const QuestionPoolSchema = z.object({
  questions: z.array(VerifiedQuestionSchema),
  source: z.enum(["live", "cache", "seed", "mixed"]).optional(),
});

const CACHE_PREFIX = "mq:seen:";

function getSeenStems(realmId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${realmId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function sourceLabel(value: unknown): "live" | "cache" | "seed" {
  if (value === "seed") return "seed";
  if (value === "cache") return "cache";
  return value === "mixed" ? "seed" : "live";
}

function retryDelay(response?: Response): number {
  const value = response?.headers.get("retry-after");
  if (!value) return 1500;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? 1500 : Math.max(0, date - Date.now());
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function useQuestions(realmId: string, stageIndex: number) {
  const [questions, setQuestions] = useState<VerifiedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"live" | "cache" | "seed">("seed");

  const cacheKey = useMemo(() => `mq:questions:${realmId}:${stageIndex}`, [realmId, stageIndex]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (typeof window !== "undefined") {
          const raw = window.sessionStorage.getItem(cacheKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            const result = QuestionPoolSchema.safeParse(parsed);
            if (result.success) {
              const pool = result.data.questions;
              if (!cancelled && pool.length > 0) {
                setQuestions(pool);
                setSource("cache");
                setLoading(false);
                return;
              }
            }
          }
        }

        const avoid = getSeenStems(realmId).slice(-24);
        let response: Response | undefined;
        for (let attempt = 0; attempt < 2; attempt++) {
          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), 30000);
          try {
            response = await fetch("/api/questions", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ realmId, stageIndex, avoid }),
              signal: controller.signal,
            });
            if (response.ok) {
              const data: unknown = await response.json();
              const body = z.object({
                questions: z.array(VerifiedQuestionSchema).optional(),
                pool: z.array(VerifiedQuestionSchema).optional(),
                source: z.enum(["live", "cache", "seed", "mixed"]).optional(),
              }).safeParse(data);
              const pool = body.success ? body.data.questions ?? body.data.pool ?? [] : [];
              if (!cancelled && pool.length > 0) {
                const normalizedSource = body.success ? sourceLabel(body.data.source) : "live";
                setQuestions(pool);
                setSource(normalizedSource);
                try {
                  window.sessionStorage.setItem(cacheKey, JSON.stringify({ questions: pool, source: normalizedSource }));
                } catch {
                  // The session cache is optional.
                }
                setLoading(false);
                return;
              }
              break;
            }
            if (attempt === 0 && (response.status === 429 || response.status >= 500)) {
              await wait(retryDelay(response));
              continue;
            }
            break;
          } catch (fetchError) {
            if (attempt === 0) {
              await wait(1500);
              continue;
            }
            console.warn("Question fetch failed; falling back to seeded content.", fetchError);
          } finally {
            window.clearTimeout(timeout);
          }
        }

        const realm = getRealm(realmId as Parameters<typeof getRealm>[0]);
        const spec = stageSpec(realm, stageIndex);
        const fallbackPools = await Promise.all(spec.subSkillIds.map(async (subSkillId) => {
          const loader = getSeedLoaderForSubSkill(subSkillId);
          return loader ? loader() : [];
        }));
        const fallback = fallbackPools.flat().filter((item) => VerifiedQuestionSchema.safeParse(item).success);
        if (!cancelled) {
          setQuestions(fallback);
          setSource("seed");
          try {
            window.sessionStorage.setItem(cacheKey, JSON.stringify({ questions: fallback, source: "seed" }));
          } catch {
            // The session cache is optional.
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load questions");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [cacheKey, realmId, stageIndex]);

  return { questions, loading, error, source };
}

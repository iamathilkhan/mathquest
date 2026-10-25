"use client";

import { useEffect, useState } from "react";
import { z } from "zod";

import { getLessonLoader } from "@/lib/client/lessonLoaders";
import { LessonSchema, type Lesson } from "@/lib/schemas";
import { PROMPT_VERSION } from "@/lib/promptVersion";

const CachedLessonSchema = z.object({
  lesson: LessonSchema,
  source: z.enum(["live", "cache", "seed"]).optional(),
});

export interface UseLessonResult {
  lesson: Lesson | null;
  source: "live" | "cache" | "seed" | null;
  status: "loading" | "ready" | "error";
  error: string | null;
  notice: string | null;
}

const retryAfterMs = (response: Response | null) => {
  const header = response?.headers.get("retry-after");
  if (!header) return 1500;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(header);
  return Number.isNaN(date) ? 1500 : Math.max(0, date - Date.now());
};

const wait = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export function lessonCacheKey(realmId: string, subSkillId: string): string {
  return `mq:lesson:${realmId}:${subSkillId}:${PROMPT_VERSION}`;
}

export function useLesson(realmId: string, subSkillId: string): UseLessonResult {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [source, setSource] = useState<UseLessonResult["source"]>(null);
  const [status, setStatus] = useState<UseLessonResult["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = lessonCacheKey(realmId, subSkillId);

    async function load() {
      setStatus("loading");
      setError(null);
      setNotice(null);
      let rateLimited = false;

      try {
        let cachedText: string | null = null;
        try {
          cachedText = window.localStorage.getItem(cacheKey);
        } catch {
          cachedText = null;
        }
        if (cachedText) {
          let parsed: unknown;
          try {
            parsed = JSON.parse(cachedText);
          } catch {
            parsed = null;
          }
          const cached = CachedLessonSchema.safeParse(parsed);
          if (cached.success) {
            if (!cancelled) {
              setLesson(cached.data.lesson);
              setSource("cache");
              setStatus("ready");
            }
            return;
          }
          try {
            window.localStorage.removeItem(cacheKey);
          } catch (storageError) {
            console.warn("Could not discard invalid lesson cache.", storageError);
          }
        }

        let response: Response | null = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), 30_000);
          try {
            response = await fetch("/api/lesson", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ realmId, subSkillId }),
              signal: controller.signal,
            });
            if (response.ok) {
              const body: unknown = await response.json();
              const parsed = z.object({ lesson: LessonSchema, source: z.enum(["live", "cache", "seed"]) }).safeParse(body);
              if (parsed.success) {
                if (!cancelled) {
                  setLesson(parsed.data.lesson);
                  setSource(parsed.data.source);
                  setStatus("ready");
                  try {
                    window.localStorage.setItem(cacheKey, JSON.stringify({ lesson: parsed.data.lesson, source: parsed.data.source }));
                  } catch {
                    // Storage can be unavailable; the lesson remains usable in memory.
                  }
                }
                return;
              }
              break;
            }
            if (attempt === 0 && (response.status === 429 || response.status >= 500)) {
              rateLimited ||= response.status === 429;
              await wait(retryAfterMs(response));
              continue;
            }
            rateLimited ||= response.status === 429;
            break;
          } catch {
            if (attempt === 0) {
              await wait(1500);
              continue;
            }
          } finally {
            window.clearTimeout(timeout);
          }
        }

        const loader = getLessonLoader(subSkillId);
        const seededLesson = loader ? await loader() : null;
        if (!seededLesson) throw new Error("No verified lesson is available for this skill yet.");
        if (!cancelled) {
          setLesson(seededLesson);
          setSource("seed");
          setStatus("ready");
          if (rateLimited) setNotice("The scroll library is busy, using saved scrolls.");
          try {
            window.localStorage.setItem(cacheKey, JSON.stringify({ lesson: seededLesson, source: "seed" }));
          } catch {
            // Storage can be unavailable; the lesson remains usable in memory.
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load this lesson.");
          setStatus("error");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [realmId, subSkillId]);

  return { lesson, source, status, error, notice };
}

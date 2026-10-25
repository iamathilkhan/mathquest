import "server-only";

import { getRealm, getSubSkill } from "@/data/curriculum";
import type { Lesson } from "@/lib/schemas";
import { verifyLesson } from "@/lib/verify/lesson";
import { type SeedProvider, fallbackLesson } from "@/lib/server/seed";
import type { LlmClient } from "@/lib/llm/gemini";
import { SYSTEM_PROMPT, lessonPrompt } from "@/lib/llm/prompts";
import { TTLCache } from "@/lib/server/cache";

export type LessonResult = {
  source: "live" | "seed" | "cache";
  model?: string;
  lesson: Lesson;
  generatedAt: number;
};

export interface LessonDeps {
  llm: LlmClient;
  seed: SeedProvider;
  now: () => number;
  cache?: TTLCache<string, LessonResult>;
}

export async function getLesson(realmId: string, subSkillId: string, deps: LessonDeps): Promise<LessonResult> {
  const cache = deps.cache ?? new TTLCache<string, LessonResult>(60_000, 20, deps.now);
  const key = `${realmId}:${subSkillId}`;
  const cached = cache.get(key);
  if (cached) {
    return { ...cached, source: "cache" };
  }

  const realm = getRealm(realmId as Parameters<typeof getRealm>[0]);
  getSubSkill(realmId as Parameters<typeof getRealm>[0], subSkillId);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await deps.llm.generateJson({
        system: SYSTEM_PROMPT,
        prompt: lessonPrompt(realm, subSkillId),
        schemaText: "Lesson",
        temperature: 0.2,
        timeoutMs: 20000,
      });

      const lesson = response.json as Lesson;
      const result = verifyLesson(lesson);
      if (result.ok) {
        const payload: LessonResult = {
          source: "live",
          model: response.model,
          lesson,
          generatedAt: deps.now(),
        };
        cache.set(key, payload);
        return payload;
      }

      const retryPrompt = `${lessonPrompt(realm, subSkillId)}\nVerification failed: ${result.reason}. Retry with a corrected lesson.`;
      if (attempt === 0) {
        const retryResponse = await deps.llm.generateJson({
          system: SYSTEM_PROMPT,
          prompt: retryPrompt,
          schemaText: "Lesson",
          temperature: 0.1,
          timeoutMs: 20000,
        });
        const retryLesson = retryResponse.json as Lesson;
        const retryResult = verifyLesson(retryLesson);
        if (retryResult.ok) {
          const payload: LessonResult = {
            source: "live",
            model: retryResponse.model,
            lesson: retryLesson,
            generatedAt: deps.now(),
          };
          cache.set(key, payload);
          return payload;
        }
      }
    } catch {
      // fall through to seed provider
    }
  }

  const seedLesson = deps.seed.lessonFor(realmId, subSkillId) ?? fallbackLesson(realmId, subSkillId);
  const payload: LessonResult = {
    source: "seed",
    lesson: seedLesson,
    generatedAt: deps.now(),
  };
  cache.set(key, payload);
  return payload;
}

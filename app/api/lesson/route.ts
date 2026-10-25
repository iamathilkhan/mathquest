import "server-only";

import { z } from "zod";

import { getRealm, getSubSkill } from "@/data/curriculum";
import { createGeminiClient } from "@/lib/llm/gemini";
import { getLesson } from "@/lib/llm/lesson";
import { withGuards } from "@/lib/http/guards";
import { createSeedProvider } from "@/lib/server/seed";
import { TTLCache } from "@/lib/server/cache";

const LessonBodySchema = z.object({
  realmId: z.string().min(1),
  subSkillId: z.string().min(1),
});

const handler = async (body: z.infer<typeof LessonBodySchema>): Promise<Response> => {
  const realm = getRealm(body.realmId as Parameters<typeof getRealm>[0]);
  const skill = getSubSkill(body.realmId as Parameters<typeof getRealm>[0], body.subSkillId);
  const result = await getLesson(body.realmId, body.subSkillId, {
    llm: createGeminiClient(),
    seed: createSeedProvider(),
    now: () => Date.now(),
    cache: new TTLCache(60_000, 20, () => Date.now()),
  });

  return Response.json({
    status: "ok",
    source: result.source,
    model: result.model,
    lesson: result.lesson,
    realm: realm.id,
    subSkill: skill.id,
  }, { status: 200 });
};

export async function POST(req: Request): Promise<Response> {
  return withGuards(LessonBodySchema, handler)(req);
}

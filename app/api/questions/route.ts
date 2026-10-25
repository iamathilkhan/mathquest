import "server-only";

import { z } from "zod";

import { getRealm, stageSpec } from "@/data/curriculum";
import { createGeminiClient } from "@/lib/llm/gemini";
import { generateStagePool } from "@/lib/llm/questions";
import { withGuards } from "@/lib/http/guards";
import { createSeedProvider } from "@/lib/server/seed";

const QuestionBodySchema = z.object({
  realmId: z.string().min(1),
  stageIndex: z.number().int().min(0).max(4),
  avoid: z.array(z.string().max(320)).max(24).default([]),
});

const handler = async (body: z.infer<typeof QuestionBodySchema>): Promise<Response> => {
  const realm = getRealm(body.realmId as Parameters<typeof getRealm>[0]);
  const spec = stageSpec(realm, body.stageIndex);
  const seed = createSeedProvider();
  const result = await generateStagePool(body.realmId, body.stageIndex, body.avoid, {
    llm: createGeminiClient(),
    seed,
    now: () => Date.now(),
  });

  return Response.json({
    status: "ok",
    source: result.source,
    model: result.model,
    pool: result.pool,
    questions: result.pool,
    counts: result.counts,
    reasons: result.reasons,
    stage: spec,
  }, { status: 200 });
};

export async function POST(req: Request): Promise<Response> {
  return withGuards(QuestionBodySchema, handler)(req);
}

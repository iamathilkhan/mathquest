import "server-only";

import { getRealm, stageSpec } from "@/data/curriculum";
import type { VerifiedQuestion, Tier } from "@/lib/schemas";
import { verifyQuestion } from "@/lib/verify/question";
import type { SeedProvider } from "@/lib/server/seed";
import type { LlmClient } from "@/lib/llm/gemini";
import { SYSTEM_PROMPT, questionPrompt } from "@/lib/llm/prompts";

export interface GenerateStagePoolDeps {
  llm: LlmClient;
  seed: SeedProvider;
  now: () => number;
}

export type GenerateStagePoolResult = {
  pool: VerifiedQuestion[];
  source: "live" | "seed" | "mixed";
  model?: string;
  counts: Record<Tier, number>;
  reasons: Record<string, number>;
  generatedAt: number;
};

function normalizeStem(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function dedupeAvoid(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = normalizeStem(value);
    if (!key) continue;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(value.trim());
    }
  }
  return out;
}

export async function generateStagePool(
  realmId: string,
  stageIndex: number,
  avoid: string[],
  deps: GenerateStagePoolDeps
): Promise<GenerateStagePoolResult> {
  const realm = getRealm(realmId as Parameters<typeof getRealm>[0]);
  const spec = stageSpec(realm, stageIndex);
  const safeAvoid = dedupeAvoid(avoid ?? []);

  const counts: Record<Tier, number> = { easy: 0, medium: 0, hard: 0 };
  const reasons: Record<string, number> = {};
  const byTier: Record<Tier, VerifiedQuestion[]> = { easy: [], medium: [], hard: [] };
  let model: string | undefined;
  let source: "live" | "seed" | "mixed" = "seed";

  const tiers: Tier[] = ["easy", "medium", "hard"];

  for (const tier of tiers) {
    try {
      const response = await deps.llm.generateJson({
        system: SYSTEM_PROMPT,
        prompt: questionPrompt(realm, { ...spec, tier, stageIndex }, safeAvoid),
        schemaText: "QuestionBatch",
        temperature: 0.2,
        timeoutMs: 20000,
      });
      model = response.model;
      const parsed = response.json as { questions?: Array<Record<string, unknown>> };
      const items = parsed?.questions ?? [];

      for (const raw of items) {
        const rawObj = raw as Record<string, unknown>;
        const normalized = {
          stem: String(rawObj.stem ?? ""),
          expression: String(rawObj.expression ?? ""),
          explanation: String(rawObj.explanation ?? ""),
          hint: String(rawObj.hint ?? ""),
          tier,
          subSkillId: typeof rawObj.subSkillId === "string" ? rawObj.subSkillId : spec.subSkillIds[0] ?? "",
          options: Array.isArray(rawObj.options) ? rawObj.options : [],
          correctIndex: Number(rawObj.correctIndex ?? 0),
        };

        const verified = verifyQuestion({
          stem: normalized.stem,
          tier,
          expression: normalized.expression,
          options: Array.isArray(normalized.options)
            ? normalized.options.map((option: Record<string, unknown>) => ({
                label: String(option.label ?? ""),
                value: String(option.value ?? ""),
                why: String(option.why ?? ""),
              }))
            : [],
          correctIndex: Number(normalized.correctIndex ?? 0),
          explanation: normalized.explanation,
          hint: normalized.hint,
          subSkillId: String(normalized.subSkillId ?? spec.subSkillIds[0] ?? ""),
        });

        if (!verified.ok) {
          reasons[verified.reason] = (reasons[verified.reason] ?? 0) + 1;
          continue;
        }

        const q = { ...verified.q, source: "live" as const };
        byTier[tier].push(q);
      }

      if (byTier[tier].length > 0) {
        source = byTier[tier].length ? "live" : "seed";
      }
    } catch (error) {
      const reason = error instanceof Error ? error.name : "llm_error";
      reasons[reason] = (reasons[reason] ?? 0) + 1;
    }

    const want = spec.perTier;
    const liveCount = byTier[tier].length;
    if (liveCount < want) {
      const seedQuestions = deps.seed.questionsFor(spec.subSkillIds, tier, safeAvoid);
      const limit = want - liveCount;
      const seeded = seedQuestions.slice(0, limit);
      for (const q of seeded) {
        if (byTier[tier].some((item) => item.id === q.id)) continue;
        byTier[tier].push({ ...q, source: "seed" as const });
      }
      if (seeded.length > 0) {
        source = byTier[tier].some((item) => item.source === "live") ? "mixed" : "seed";
      }
    }
    counts[tier] = byTier[tier].length;
  }

  const pool = (Object.keys(byTier) as Tier[]).flatMap((tier) => byTier[tier]);
  return {
    pool,
    source,
    model,
    counts,
    reasons,
    generatedAt: deps.now(),
  };
}

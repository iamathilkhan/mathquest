/**
 * lib/schemas.ts
 * All Zod schemas and inferred TypeScript types for MathQuest.
 *
 * Design note: one Zod schema IS the TS type, the runtime validator, and the
 * structure passed to the LLM as a JSON Schema hint. This eliminates drift
 * between types and validation.
 */
import { z } from "zod";

// ─── Primitives ────────────────────────────────────────────────────────────────

export const TierSchema = z.enum(["easy", "medium", "hard"]);
export type Tier = z.infer<typeof TierSchema>;

// ─── Question building blocks ────────────────────────────────────────────────────

export const OptionSchema = z.object({
  /** Short display text shown to the student, e.g. "1 1/4" or "1.25" */
  label: z.string().min(1).max(40),
  /** Canonical numeric string the verifier evaluates, e.g. "5/4" or "1.25" */
  value: z.string().min(1).max(20),
  /** Brief explanation of why this option is right or wrong */
  why: z.string().max(140).default(""),
});
export type Option = z.infer<typeof OptionSchema>;

export const RawQuestionSchema = z.object({
  /** The question text shown to the student */
  stem: z.string().min(10).max(320),
  tier: TierSchema,
  /**
   * A math expression the server evaluates with exact arithmetic.
   * Must produce a value that matches exactly one option.
   * Only digits, +, -, *, /, (, ), ., and whitespace are allowed.
   */
  expression: z.string().min(1).max(80),
  /** Exactly 4 options */
  options: z.array(OptionSchema).length(4),
  /** Model's claim of which index is correct (0-3). Verifier will override if wrong. */
  correctIndex: z.number().int().min(0).max(3),
  /** Explanation shown after the student answers */
  explanation: z.string().min(10).max(400),
  /** Optional hint for Power-Up use */
  hint: z.string().max(160).default(""),
  /** Optional: sub-skill id the question belongs to. Server fills for boss stages. */
  subSkillId: z.string().optional(),
});
export type RawQuestion = z.infer<typeof RawQuestionSchema>;

export const QuestionBatchSchema = z.object({
  questions: z.array(RawQuestionSchema).min(1).max(15),
});
export type QuestionBatch = z.infer<typeof QuestionBatchSchema>;

export const VerifiedQuestionSchema = RawQuestionSchema.extend({
  /** Stable id derived from content hash — never a random UUID */
  id: z.string(),
  /** E.g. "3/4 + 1/2 = 5/4" — what the server computed */
  check: z.string(),
  /** Whether the model's correctIndex differed from the verified one */
  correctedFromModel: z.boolean().optional(),
  /** Where the question came from */
  source: z.enum(["live", "cache", "seed"]),
  /** Required: which sub-skill this question tests */
  subSkillId: z.string(),
});
export type VerifiedQuestion = z.infer<typeof VerifiedQuestionSchema>;

// ─── Question pools ────────────────────────────────────────────────────────────────

export const PoolsSchema = z.object({
  easy: z.array(VerifiedQuestionSchema),
  medium: z.array(VerifiedQuestionSchema),
  hard: z.array(VerifiedQuestionSchema),
});
export type Pools = z.infer<typeof PoolsSchema>;

// ─── Answer / history ──────────────────────────────────────────────────────────────

export const AnswerRecordSchema = z.object({
  id: z.string(),
  tier: TierSchema,
  correct: z.boolean(),
  subSkillId: z.string(),
});
export type AnswerRecord = z.infer<typeof AnswerRecordSchema>;

// ─── Stage result ─────────────────────────────────────────────────────────────────

export const StageResultSchema = z.object({
  realmId: z.string(),
  stageIndex: z.number().int().min(0).max(4),
  won: z.boolean(),
  stars: z.number().int().min(0).max(3),
  xp: z.number().int().min(0),
  coins: z.number().int().min(0),
  correctCount: z.number().int().min(0),
  wrongCount: z.number().int().min(0),
  isBoss: z.boolean(),
  history: z.array(AnswerRecordSchema),
  endTier: TierSchema.optional(),
});
export type StageResult = z.infer<typeof StageResultSchema>;

// ─── Lesson ────────────────────────────────────────────────────────────────────────

export const VocabItemSchema = z.object({
  term: z.string().min(1).max(40),
  definition: z.string().min(1).max(200),
});
export type VocabItem = z.infer<typeof VocabItemSchema>;

export const WorkedExampleSchema = z.object({
  problem: z.string().min(1).max(300),
  /** Math expression the server re-evaluates to confirm correctness */
  expression: z.string().min(1).max(80),
  /** String value the server checks the expression equals */
  answerValue: z.string().min(1).max(20),
  /** Human-readable steps, 2-6 items */
  steps: z.array(z.string().min(1).max(200)).min(2).max(6),
});
export type WorkedExample = z.infer<typeof WorkedExampleSchema>;

export const SceneVisualSchema = z.enum([
  "text",
  "fractionBar",
  "numberLine",
  "areaGrid",
  "ratioTable",
  "steps",
]);
export type SceneVisual = z.infer<typeof SceneVisualSchema>;

export const SceneSchema = z.object({
  /** Narration text for this slide */
  narration: z.string().min(1).max(400),
  visual: SceneVisualSchema,
  /** Optional data for the diagram renderer */
  visualData: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});
export type Scene = z.infer<typeof SceneSchema>;

export const InfographicSchema = z.object({
  headline: z.string().min(1).max(80),
  keyPoints: z.array(z.string().min(1).max(120)).min(3).max(4),
  /** Code-drawn diagram type; AI art is offline, never runtime */
  diagram: z.enum(["fractionBar", "numberLine", "areaGrid", "ratioTable", "steps", "none"]),
});
export type Infographic = z.infer<typeof InfographicSchema>;

export const LessonSchema = z.object({
  title: z.string().min(1).max(100),
  hook: z.string().min(1).max(300),
  bigIdea: z.string().min(1).max(300),
  vocabulary: z.array(VocabItemSchema).max(5),
  workedExamples: z.array(WorkedExampleSchema).min(2).max(3),
  commonMistakes: z.array(z.string().min(1).max(200)).min(2).max(4),
  realWorld: z.string().min(1).max(200),
  scenes: z.array(SceneSchema).min(4).max(6),
  infographic: InfographicSchema,
});
export type Lesson = z.infer<typeof LessonSchema>;

// ─── Player persistence ───────────────────────────────────────────────────────────────

/** Per-skill adaptive state stored in the player save */
export const SkillStateSchema = z.object({
  tier: TierSchema,
  /** Rolling window of last 20 answer outcomes */
  recent: z.array(z.boolean()).max(20),
});
export type SkillState = z.infer<typeof SkillStateSchema>;

/** Per sub-skill accuracy stats */
export const SubSkillStatsSchema = z.record(
  z.string(), // key format: `${realmId}:${subSkillId}`
  z.object({ right: z.number().int().min(0), total: z.number().int().min(0) })
);
export type SubSkillStats = z.infer<typeof SubSkillStatsSchema>;

/** Realm progress stored in the player save */
export const RealmProgressSchema = z.object({
  /** Stars earned per stage (index 0-4), -1 means not attempted */
  stars: z.array(z.number().int().min(-1).max(3)).length(5),
  bossDefeated: z.boolean(),
});
export type RealmProgress = z.infer<typeof RealmProgressSchema>;

export const PlayerSettingsSchema = z.object({
  sound: z.boolean().optional(),
  music: z.boolean().optional(),
  motion: z.enum(["system", "reduce", "full"]).optional(),
  readable: z.boolean().optional(),
  demoMode: z.boolean().optional().default(false),
  readableFont: z.boolean().optional().default(false),
  reducedMotion: z.boolean().optional().default(false),
  sfxEnabled: z.boolean().optional().default(true),
});
export type PlayerSettings = z.infer<typeof PlayerSettingsSchema>;

export const InventorySchema = z.object({
  hint: z.number().int().min(0).default(0),
  shield: z.number().int().min(0).default(1),
  fifty: z.number().int().min(0).default(1),
});
export type Inventory = z.infer<typeof InventorySchema>;

export const LifetimeStatsSchema = z.object({
  answered: z.number().int().min(0).default(0),
  correct: z.number().int().min(0).default(0),
  stagesCleared: z.number().int().min(0).default(0),
  bestCombo: z.number().int().min(0).default(0),
});
export type LifetimeStats = z.infer<typeof LifetimeStatsSchema>;

export const ProfileSchema = z.object({
  name: z.string().max(20).default(""),
  grade: z.number().int().min(5).max(6).default(5),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const PlayerSchema = z.object({
  profile: ProfileSchema.optional(),
  grade: z.number().int().min(5).max(6).optional(),
  level: z.number().int().min(1).default(1),
  xp: z.number().int().min(0).default(0),
  coins: z.number().int().min(0).default(0),
  /** Map from realmId to progress */
  realms: z.record(z.string(), RealmProgressSchema).default({}),
  /** Map from realmId to adaptive skill state */
  skill: z.record(z.string(), SkillStateSchema).default({}),
  subSkillStats: SubSkillStatsSchema.default({}),
  /** Badge ids earned */
  badges: z.array(z.string()).default([]),
  /** Current daily streak */
  streak: z.number().int().min(0).default(0),
  /** ISO date string of last played day */
  lastDay: z.string().optional(),
  lastPlayed: z.string().optional(),
  retreatedStages: z.array(z.string()).optional(),
  inventory: InventorySchema.optional(),
  lessonsFinished: z.array(z.string()).optional(),
  retreats: z.number().int().min(0).optional(),
  lifetime: LifetimeStatsSchema.optional(),
  settings: PlayerSettingsSchema.optional(),
  /** Current realm position on the map (realmId or null) */
  mapNode: z.string().optional(),
  /** Player's chosen hero {classId, variant} or null */
  hero: z
    .object({
      classId: z.enum(["knight", "mage", "ranger"]),
      variant: z.enum(["boy", "girl"]),
    })
    .optional(),
  /**
   * ISO timestamp of when the player ran out of hearts (all hearts lost).
   * Used to compute timed heart regeneration: 1 heart every 5 minutes, full (3) in 15 min.
   * Null/undefined = player has full hearts.
   */
  heartsLostAt: z.string().optional(),
  /** Current active hearts (0-5). When undefined, player has full hearts. */
  currentHearts: z.number().int().min(0).max(5).optional(),
});
export type Player = z.infer<typeof PlayerSchema>;

// ─── Schema description helper ──────────────────────────────────────────────────────────

/**
 * Returns a human-readable JSON Schema description for a Zod schema.
 * Used to embed schema hints into LLM prompts.
 */
export function schemaDescriptionFor(schema: z.ZodTypeAny): string {
  return JSON.stringify(z.toJSONSchema(schema), null, 2);
}


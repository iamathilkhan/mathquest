/**
 * lib/game/badges.ts
 * Pure badge evaluation engine.
 *
 * All badges are defined as pure predicate functions over the evaluation context.
 * evaluateBadges(ctx) returns ONLY newly earned badge IDs (excluding already earned ones).
 */
import type { Player, StageResult } from "@/lib/schemas";
import { ENABLED_REALMS, type RealmId } from "@/lib/config";

export interface BadgeContext {
  before: Player;
  after: Player;
  stageResult?: StageResult;
  /** True if the student completed a lesson right before challenging a boss */
  lessonCompletedBeforeBoss?: boolean;
  /** True if the student had previously retreated/lost on this exact stage */
  hadEarlierRetreat?: boolean;
  /** Explicit bestCombo if tracked outside history */
  bestCombo?: number;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  predicate: (ctx: BadgeContext) => boolean;
}

// ─── Helper to compute combo from history ──────────────────────────────────────────

function computeBestCombo(ctx: BadgeContext): number {
  if (ctx.bestCombo !== undefined) return ctx.bestCombo;
  if (!ctx.stageResult?.history) return 0;
  let maxRun = 0;
  let currentRun = 0;
  for (const h of ctx.stageResult.history) {
    if (h.correct) {
      currentRun++;
      if (currentRun > maxRun) maxRun = currentRun;
    } else {
      currentRun = 0;
    }
  }
  return maxRun;
}

function countHardCorrect(ctx: BadgeContext): number {
  if (!ctx.stageResult?.history) return 0;
  return ctx.stageResult.history.filter((h) => h.tier === "hard" && h.correct).length;
}

// ─── Badge Registry ───────────────────────────────────────────────────────────────

export const BADGES: BadgeDefinition[] = [
  {
    id: "first_blood",
    name: "First Blood",
    description: "Answer your first math question correctly.",
    predicate: (ctx) => {
      if (ctx.stageResult?.correctCount && ctx.stageResult.correctCount >= 1) return true;
      if (ctx.stageResult?.history?.some((h) => h.correct)) return true;
      return false;
    },
  },
  {
    id: "untouchable",
    name: "Untouchable",
    description: "Win a stage without losing a single heart (0 wrong answers).",
    predicate: (ctx) => {
      return Boolean(ctx.stageResult?.won && ctx.stageResult.wrongCount === 0);
    },
  },
  {
    id: "combo_master",
    name: "Combo Master",
    description: "Achieve a combo streak of 7 or higher in a single battle.",
    predicate: (ctx) => computeBestCombo(ctx) >= 7,
  },
  {
    id: "hard_mode_hero",
    name: "Hard Mode Hero",
    description: "Answer 5 or more hard questions correctly in a single stage.",
    predicate: (ctx) => countHardCorrect(ctx) >= 5,
  },
  {
    id: "comeback_kid",
    name: "Comeback Kid",
    description: "Win a stage after an earlier retreat on the same stage.",
    predicate: (ctx) => Boolean(ctx.stageResult?.won && ctx.hadEarlierRetreat),
  },
  {
    id: "scholar",
    name: "Scholar",
    description: "Complete a lesson before facing a Guardian boss.",
    predicate: (ctx) => Boolean(ctx.lessonCompletedBeforeBoss),
  },
  // Realm liberators for each enabled realm
  ...ENABLED_REALMS.map((realmId: RealmId) => ({
    id: `realm_liberator_${realmId}`,
    name: `Liberator of ${realmId}`,
    description: `Defeat the Guardian boss of ${realmId}.`,
    predicate: (ctx: BadgeContext) => {
      const isThisBossWon =
        Boolean(ctx.stageResult?.won) &&
        Boolean(ctx.stageResult?.isBoss) &&
        ctx.stageResult?.realmId === realmId;
      const recordedInPlayer = Boolean(ctx.after.realms[realmId]?.bossDefeated);
      return isThisBossWon || recordedInPlayer;
    },
  })),
  {
    id: "on_fire_3",
    name: "On Fire (3-Day)",
    description: "Maintain a 3-day daily streak.",
    predicate: (ctx) => ctx.after.streak >= 3,
  },
  {
    id: "on_fire_7",
    name: "On Fire (7-Day)",
    description: "Maintain a 7-day daily streak.",
    predicate: (ctx) => ctx.after.streak >= 7,
  },
  {
    id: "globetrotter",
    name: "Globetrotter",
    description: "Clear stage 1 in every enabled realm.",
    predicate: (ctx) => {
      return ENABLED_REALMS.every((realmId) => {
        const prog = ctx.after.realms[realmId];
        return prog && prog.stars[0] !== undefined && prog.stars[0] >= 1;
      });
    },
  },
  {
    id: "perfectionist",
    name: "Perfectionist",
    description: "Earn 3 stars on all 5 stages of a realm.",
    predicate: (ctx) => {
      return ENABLED_REALMS.some((realmId) => {
        const prog = ctx.after.realms[realmId];
        if (!prog) return false;
        return prog.stars.length === 5 && prog.stars.every((s) => s === 3);
      });
    },
  },
];

// ─── Evaluator ─────────────────────────────────────────────────────────────────────

/**
 * Evaluates all badges and returns ONLY newly earned badge IDs.
 * Does not mutate before or after.
 */
export function evaluateBadges(ctx: BadgeContext): string[] {
  const existingBadges = new Set(ctx.before.badges);
  const newlyEarned: string[] = [];

  for (const badge of BADGES) {
    if (existingBadges.has(badge.id)) continue;
    if (badge.predicate(ctx)) {
      newlyEarned.push(badge.id);
    }
  }

  return newlyEarned;
}

/**
 * lib/game/skill.ts
 * Cross-session adaptivity and sub-skill tracking for the Quest Journal.
 * Pure logic, no I/O, no React.
 */
import type { Tier, AnswerRecord, SkillState, SubSkillStats } from "@/lib/schemas";

/**
 * Append new answers to the realm skill state, keeping at most the last 20 outcomes.
 * Updates the tier to the battle engine's ending tier.
 */
export function updateSkill(
  skill: SkillState | undefined,
  history: AnswerRecord[],
  endTier: Tier
): SkillState {
  const currentRecent = skill?.recent ?? [];
  const newOutcomes = history.map((h) => h.correct);
  const combined = [...currentRecent, ...newOutcomes].slice(-20);

  return {
    tier: endTier,
    recent: combined,
  };
}

/**
 * Calculate mastery percentage (0-100) from recent answer history.
 * Returns 0 if there are fewer than 5 answers (insufficient data).
 */
export function masteryPct(skill: SkillState | undefined): number {
  if (!skill || skill.recent.length < 5) return 0;
  const right = skill.recent.filter(Boolean).length;
  return Math.round((right / skill.recent.length) * 100);
}

/**
 * Determine the starting tier for a stage:
 * - Stage 0 with no skill record: starts at "easy"
 * - Otherwise: skill.tier (or "easy" if undefined)
 * - Boss stages (stageIndex === 4): NEVER start below "medium"
 */
export function startTierFor(skill: SkillState | undefined, stageIndex: number): Tier {
  let tier: Tier = skill ? skill.tier : "easy";

  if (stageIndex === 4) {
    // Boss stage: floor at medium
    if (tier === "easy") tier = "medium";
  }

  return tier;
}

/**
 * Update sub-skill accuracy statistics with new answer records.
 */
export function updateSubSkillStats(
  stats: SubSkillStats,
  history: AnswerRecord[],
  realmId: string
): SubSkillStats {
  const updated: SubSkillStats = { ...stats };

  for (const record of history) {
    if (!record.subSkillId) continue;
    const key = `${realmId}:${record.subSkillId}`;
    const prev = updated[key] ?? { right: 0, total: 0 };
    updated[key] = {
      right: prev.right + (record.correct ? 1 : 0),
      total: prev.total + 1,
    };
  }

  return updated;
}

/**
 * Find the sub-skill with the lowest accuracy below threshold,
 * requiring at least minSamples to qualify.
 * Returns the key `${realmId}:${subSkillId}` or null if none qualify.
 */
export function weakestSubSkill(
  stats: SubSkillStats,
  minSamples = 5,
  threshold = 0.7
): string | null {
  let lowestAccuracy = 1.1; // above maximum possible
  let weakestKey: string | null = null;

  for (const [key, stat] of Object.entries(stats)) {
    if (stat.total < minSamples) continue;
    const accuracy = stat.right / stat.total;
    if (accuracy < threshold && accuracy < lowestAccuracy) {
      lowestAccuracy = accuracy;
      weakestKey = key;
    }
  }

  return weakestKey;
}

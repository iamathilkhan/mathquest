/**
 * lib/game/adaptive.ts
 * Pure adaptive difficulty engine.
 *
 * Rules:
 *   - 2 correct in a row → promote one tier (max: hard)
 *   - 2 wrong in a row → demote one tier (min: easy)
 *   - single wrong only increments wrongRun counter
 *   - after any tier change, enforce tier >= floor
 *
 * Pure: no I/O, no Date, no Math.random. All inputs are parameters.
 */
import type { Tier, Pools, VerifiedQuestion } from "@/lib/schemas";

export const TIERS: readonly Tier[] = ["easy", "medium", "hard"] as const;

export interface AdaptiveState {
  tier: Tier;
  rightRun: number; // consecutive correct answers
  wrongRun: number; // consecutive wrong answers
}

export function initialAdaptive(start: Tier): AdaptiveState {
  return { tier: start, rightRun: 0, wrongRun: 0 };
}

/**
 * Compute the next adaptive state after an answer.
 *
 * @param state - current adaptive state
 * @param correct - whether the student answered correctly
 * @param floor - minimum tier allowed ("easy" for minions; floorForBoss() for boss)
 */
export function nextAdaptive(
  state: AdaptiveState,
  correct: boolean,
  floor: Tier
): AdaptiveState {
  let { tier, rightRun, wrongRun } = state;

  if (correct) {
    rightRun += 1;
    wrongRun = 0;
    if (rightRun >= 2) {
      tier = promoteTier(tier);
      rightRun = 0;
    }
  } else {
    wrongRun += 1;
    rightRun = 0;
    if (wrongRun >= 2) {
      tier = demoteTier(tier);
      wrongRun = 0;
    }
  }

  // Enforce floor
  tier = maxTier(tier, floor);

  return { tier, rightRun, wrongRun };
}

/**
 * Determine the adaptive floor for a boss battle based on enemy HP percentage.
 * hpPct = currentHp / maxHp
 *
 * Phase 1 (hp > 0.66): floor is easy
 * Phase 2 (0.33 < hp <= 0.66): floor is medium
 * Phase 3 (hp <= 0.33): floor is hard
 */
export function floorForBoss(hpPct: number): Tier {
  if (hpPct > 0.66) return "easy";
  if (hpPct > 0.33) return "medium";
  return "hard";
}

// ─── Pool drawing ──────────────────────────────────────────────────────────────────

export interface TakeResult {
  q: VerifiedQuestion;
  servedTier: Tier;
  pools: Pools; // new pools with the question removed (never mutates input)
}

/**
 * Draw the next question from the pools.
 *
 * Tries `want` tier first; falls back to nearest tier (ties prefer easier).
 * MUST NOT MUTATE the input pools — returns new pool objects.
 *
 * Returns null if all pools are exhausted.
 */
export function takeQuestion(
  pools: Pools,
  want: Tier
): TakeResult | null {
  // Build fallback order: start at `want`, then try neighbours
  const order = fallbackOrder(want);

  for (const tier of order) {
    const pool = pools[tier];
    if (pool.length > 0) {
      const q = pool[0]!;
      // Return new pools with this question removed (immutable)
      const newPools: Pools = {
        easy: [...pools.easy],
        medium: [...pools.medium],
        hard: [...pools.hard],
      };
      newPools[tier] = pool.slice(1);
      return { q, servedTier: tier, pools: newPools };
    }
  }

  return null; // all exhausted
}

// ─── Private helpers ────────────────────────────────────────────────────────────────

function tierIndex(t: Tier): number {
  return TIERS.indexOf(t);
}

function tierAt(i: number): Tier {
  const clamped = Math.max(0, Math.min(TIERS.length - 1, i));
  return TIERS[clamped]!;
}

function promoteTier(t: Tier): Tier {
  return tierAt(tierIndex(t) + 1);
}

function demoteTier(t: Tier): Tier {
  return tierAt(tierIndex(t) - 1);
}

/** Return the higher (harder) of two tiers. */
function maxTier(a: Tier, b: Tier): Tier {
  return tierIndex(a) >= tierIndex(b) ? a : b;
}

/**
 * Build fallback order starting at `want`.
 * Ties prefer easier: if want=medium and both easy and hard are available,
 * easy is tried before hard.
 *
 * want=easy   → [easy, medium, hard]
 * want=medium → [medium, easy, hard]
 * want=hard   → [hard, medium, easy]
 */
function fallbackOrder(want: Tier): Tier[] {
  const wantIdx = tierIndex(want);
  const order: Tier[] = [want];
  let lo = wantIdx - 1;
  let hi = wantIdx + 1;
  while (lo >= 0 || hi < TIERS.length) {
    if (lo >= 0) {
      order.push(TIERS[lo]!);
      lo--;
    }
    if (hi < TIERS.length) {
      order.push(TIERS[hi]!);
      hi++;
    }
  }
  return order;
}

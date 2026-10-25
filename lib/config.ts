/**
 * lib/config.ts
 * Single source of truth for all game constants.
 * Changing a value here propagates everywhere — no magic numbers elsewhere.
 */

export const GRADE6_UNLOCK_LEVEL = 1 as const;

export const ENABLED_REALMS = [
  "g5-fractions",
  "g5-decimals",
  "g5-volume",
  "g6-ratios",
  "g6-fracdiv",
  "g6-area",
] as const;

export type RealmId = (typeof ENABLED_REALMS)[number];

export const QUESTIONS_PER_TIER_NORMAL = 4 as const; // pool 12 = 4+4+4
export const QUESTIONS_PER_TIER_BOSS = 5 as const; // pool 15

/** hearts formula: min(5, 3 + floor((level-1)/3)) */
export function heartsFor(level: number): number {
  return Math.min(5, 3 + Math.floor((level - 1) / 3));
}

export const MINION_Q = 8 as const;
export const BOSS_Q = 10 as const;
export const MINION_HP = 80 as const;
export const BOSS_HP = 140 as const;

export const COINS_PER_CORRECT = 2 as const;
export const COINS_PER_STAR = 5 as const;
export const COINS_BOSS_WIN = 25 as const;

export const DAMAGE_BASE = {
  easy: 10,
  medium: 15,
  hard: 25,
} as const;

export const XP_BASE = {
  easy: 10,
  medium: 20,
  hard: 35,
} as const;

/** combo bonus multiplier: 1 + 0.1*min(combo, 5) */
export function comboMultiplier(combo: number): number {
  return 1 + 0.1 * Math.min(combo, 5);
}

export const COMBO_REWARDS = {
  3: "hint",
  5: "shield",
} as const satisfies Record<number, "hint" | "shield">;

export const STAR_BONUS_XP = {
  1: 20,
  2: 40,
  3: 60,
} as const satisfies Record<number, number>;

export const FEATURES = {
  music: false,
  supplies: false,
  demoModeToggle: true,
} as const;

/** Level at which XP bar fills: 100 + 60*(level-1) */
export function xpToNext(level: number): number {
  return 100 + 60 * (level - 1);
}

/**
 * lib/game/xp.ts
 * XP, levelling, hearts, coins, stars, and title computations.
 * All pure functions; no I/O.
 */
import type { Tier } from "@/lib/schemas";
import {
  XP_BASE,
  DAMAGE_BASE,
  comboMultiplier,
  STAR_BONUS_XP,
  COINS_PER_CORRECT,
  COINS_PER_STAR,
  COINS_BOSS_WIN,
} from "@/lib/config";

// ─── XP per answer ───────────────────────────────────────────────────────────────

/** XP earned for a correct answer. Combo multiplier caps at 5. */
export function xpForAnswer(tier: Tier, combo: number): number {
  return Math.round(XP_BASE[tier] * comboMultiplier(combo));
}

/** Damage dealt to the enemy for a correct answer. */
export function damageFor(tier: Tier, combo: number): number {
  return Math.round(DAMAGE_BASE[tier] * comboMultiplier(combo));
}

// ─── Levelling ───────────────────────────────────────────────────────────────────

/** XP required to complete level `level` (and start level+1). */
export function xpToNext(level: number): number {
  return 100 + 60 * (level - 1);
}

export interface LevelInfo {
  level: number;
  intoLevel: number; // XP progress within current level
  needed: number; // XP needed to reach next level
}

/** Compute level and progress from total accumulated XP. */
export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpToNext(level)) {
    remaining -= xpToNext(level);
    level++;
  }
  return { level, intoLevel: remaining, needed: xpToNext(level) };
}

// ─── Titles ───────────────────────────────────────────────────────────────────────

export const TITLES = [
  "Novice Wanderer",
  "Apprentice Scholar",
  "Number Knight",
  "Fraction Squire",
  "Decimal Ranger",
  "Ratio Crusader",
  "Volume Sentinel",
  "Algebra Warden",
  "Math Sage",
  "Grand Arithmetician",
] as const;

/** Title for a given level. Levels above 10 get the last title. */
export function titleForLevel(level: number): string {
  const idx = Math.min(Math.max(0, level - 1), TITLES.length - 1);
  return TITLES[idx]!;
}

// ─── Hearts ───────────────────────────────────────────────────────────────────────

/** Hearts available at a given level: min(5, 3 + floor((level-1)/3)) */
export function heartsFor(level: number): number {
  return Math.min(5, 3 + Math.floor((level - 1) / 3));
}

// ─── Stars ───────────────────────────────────────────────────────────────────────

/**
 * Stars for a completed stage based on wrong answers (only counts on wins).
 * wrongCount=0 → 3 stars; wrongCount=1 → 2 stars; wrongCount>=2 → 1 star.
 * Losing: 0 stars.
 */
export function starsFor(wrongCount: number, won: boolean): number {
  if (!won) return 0;
  if (wrongCount === 0) return 3;
  if (wrongCount === 1) return 2;
  return 1;
}

/** Bonus XP for stage stars. Boss stages double the bonus. */
export function stageBonusXp(stars: number, isBoss: boolean): number {
  const base = STAR_BONUS_XP[stars as keyof typeof STAR_BONUS_XP] ?? 0;
  return isBoss ? base * 2 : base;
}

// ─── Coins ───────────────────────────────────────────────────────────────────────

export interface CoinParams {
  correctCount: number;
  stars: number;
  isBoss: boolean;
  won: boolean;
}

/** Total coins earned for a completed stage. */
export function coinsFor({ correctCount, stars, isBoss, won }: CoinParams): number {
  let total = correctCount * COINS_PER_CORRECT;
  if (won) {
    total += stars * COINS_PER_STAR;
    if (isBoss) total += COINS_BOSS_WIN;
  }
  return total;
}

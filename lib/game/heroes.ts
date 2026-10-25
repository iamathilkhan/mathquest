/**
 * lib/game/heroes.ts
 *
 * Pure hero logic: multipliers, weapon tiers, names, display helpers.
 * No React, no I/O, no Date.now, no Math.random.
 */

import type { Hero } from "@/data/heroes";
import { getHeroClass, DEFAULT_HERO_NAMES, FAVOURED_DAMAGE_MULTIPLIER } from "@/data/heroes";
import type { ClassId } from "@/data/heroes";

/**
 * Favoured multiplier: FAVOURED_DAMAGE_MULTIPLIER if realm is in hero's favouredRealms, else 1.
 */
export function favouredMultiplier(classId: ClassId, realmId: string): number {
  const heroClass = getHeroClass(classId);
  return heroClass.favouredRealms.includes(realmId) ? FAVOURED_DAMAGE_MULTIPLIER : 1;
}

/**
 * Weapon tier based on player level.
 * 1 for levels 1-4, 2 for levels 5-9, 3 for levels 10+
 */
export function weaponTier(level: number): 1 | 2 | 3 {
  if (level >= 10) return 3;
  if (level >= 5) return 2;
  return 1;
}

/**
 * Weapon name by type and tier.
 */
export function weaponName(weapon: "sword" | "staff" | "bow", tier: 1 | 2 | 3): string {
  const names: Record<"sword" | "staff" | "bow", Record<1 | 2 | 3, string>> = {
    sword: { 1: "Wooden Sword", 2: "Iron Sword", 3: "Silver Sword" },
    staff: { 1: "Oak Staff", 2: "Crystal Staff", 3: "Star Staff" },
    bow: { 1: "Short Bow", 2: "Long Bow", 3: "Moon Bow" },
  };
  return names[weapon][tier];
}

/**
 * XP multiplier for ranger: 1.15, else 1.
 */
export function xpMultiplier(classId: ClassId): number {
  return classId === "ranger" ? 1.15 : 1;
}

/**
 * Resolve a player's hero display name (custom name or default).
 */
export function heroDisplayName(customName: string | undefined, hero: Hero | null): string {
  if (customName && customName.trim()) {
    return customName.trim();
  }
  if (hero) {
    return DEFAULT_HERO_NAMES[hero.classId][hero.variant];
  }
  return "Number Knight";
}

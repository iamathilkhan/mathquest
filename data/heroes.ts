/**
 * data/heroes.ts
 *
 * Hero classes, default names, weapon definitions, and helper functions.
 * Pure data file (no React, no I/O).
 */

export type ClassId = "knight" | "mage" | "ranger";
export type Variant = "boy" | "girl";

export interface Hero {
  classId: ClassId;
  variant: Variant;
}

export interface Passive {
  id: string;
  name: string;
  text: string;
}

export interface Special {
  id: string;
  name: string;
  text: string;
  chargeNeeded: number;
  maxUses: number;
}

export interface HeroClass {
  id: ClassId;
  displayName: string;
  weapon: "sword" | "staff" | "bow";
  flavour: string;
  passive: Passive;
  special: Special;
  favouredRealms: string[];
}

export const HERO_CLASSES: Record<ClassId, HeroClass> = {
  knight: {
    id: "knight",
    displayName: "Knight",
    weapon: "sword",
    flavour: "Stalwart and strong, protector of the realm",
    passive: {
      id: "stalwart",
      name: "Stalwart",
      text: "First wrong answer costs no heart",
    },
    special: {
      id: "power-strike",
      name: "Power Strike",
      text: "Next correct answer deals 2× damage",
      chargeNeeded: 2,
      maxUses: 2,
    },
    favouredRealms: ["g5-fractions", "g5-decimals"],
  },
  mage: {
    id: "mage",
    displayName: "Mage",
    weapon: "staff",
    flavour: "Wise and thoughtful, master of arcane knowledge",
    passive: {
      id: "insight",
      name: "Insight",
      text: "+1 hint available per battle",
    },
    special: {
      id: "arcane-clarity",
      name: "Arcane Clarity",
      text: "Hide 2 wrong answer options",
      chargeNeeded: 2,
      maxUses: 2,
    },
    favouredRealms: ["g6-ratios", "g6-fracdiv", "g6-area"],
  },
  ranger: {
    id: "ranger",
    displayName: "Ranger",
    weapon: "bow",
    flavour: "Swift and precise, hunter of answers",
    passive: {
      id: "quick-study",
      name: "Quick Study",
      text: "Earn 15% bonus XP from correct answers",
    },
    special: {
      id: "second-wind",
      name: "Second Wind",
      text: "Restore 1 heart",
      chargeNeeded: 2,
      maxUses: 2,
    },
    favouredRealms: ["g5-volume"],
  },
};

/** Favoured damage multiplier constant */
export const FAVOURED_DAMAGE_MULTIPLIER = 1.5;

/** Default hero names per class and variant */
export const DEFAULT_HERO_NAMES: Record<ClassId, Record<Variant, string>> = {
  knight: { boy: "Aric", girl: "Brenna" },
  mage: { boy: "Eli", girl: "Mira" },
  ranger: { boy: "Finn", girl: "Lyra" },
};

/**
 * Get the default name for a hero if the player didn't enter a custom name.
 */
export function getDefaultHeroName(classId: ClassId, variant: Variant): string {
  return DEFAULT_HERO_NAMES[classId][variant];
}

/**
 * Get all heroes filtered by variant (or all if variant is null).
 */
export function getHeroesByVariant(
  variant: Variant | "any"
): Array<{ classId: ClassId; variant: Variant }> {
  const classes: ClassId[] = ["knight", "mage", "ranger"];
  const variants: Variant[] = variant === "any" ? ["boy", "girl"] : [variant as Variant];
  const result: Array<{ classId: ClassId; variant: Variant }> = [];

  for (const classId of classes) {
    for (const v of variants) {
      result.push({ classId, variant: v });
    }
  }

  return result;
}

/**
 * Resolve a hero to its slot id for art manifest (e.g. "hero-knight-boy").
 */
export function heroSlotId(hero: Hero): string {
  return `hero-${hero.classId}-${hero.variant}`;
}

/**
 * Resolve a hero portrait slot id (e.g. "hero-knight-boy-portrait").
 */
export function heroPortraitSlotId(hero: Hero): string {
  return `hero-${hero.classId}-${hero.variant}-portrait`;
}

/**
 * Get the HeroClass definition for a given ClassId.
 */
export function getHeroClass(classId: ClassId): HeroClass {
  return HERO_CLASSES[classId];
}

/**
 * Verify that every realm id appears in exactly one class's favouredRealms.
 */
export function validateHeroRealmCoverage(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const realmCounts = new Map<string, number>();

  for (const heroClass of Object.values(HERO_CLASSES)) {
    for (const realmId of heroClass.favouredRealms) {
      realmCounts.set(realmId, (realmCounts.get(realmId) ?? 0) + 1);
    }
  }

  for (const [realmId, count] of realmCounts) {
    if (count !== 1) {
      errors.push(`Realm ${realmId} appears in ${count} classes (expected exactly 1)`);
    }
  }

  return { valid: errors.length === 0, errors };
}

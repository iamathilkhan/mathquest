/**
 * data/heroes.test.ts
 *
 * Tests for hero data structure, validation, and helpers.
 */
import { describe, it, expect } from "vitest";
import {
  HERO_CLASSES,
  DEFAULT_HERO_NAMES,
  getDefaultHeroName,
  getHeroesByVariant,
  heroSlotId,
  heroPortraitSlotId,
  getHeroClass,
  validateHeroRealmCoverage,
  type ClassId,
  type Variant,
} from "./heroes";

describe("HERO_CLASSES", () => {
  it("has knight, mage, and ranger", () => {
    expect(Object.keys(HERO_CLASSES)).toEqual(["knight", "mage", "ranger"]);
  });

  it("every class has all required fields", () => {
    for (const heroClass of Object.values(HERO_CLASSES)) {
      expect(heroClass.id).toBeDefined();
      expect(heroClass.displayName).toBeDefined();
      expect(heroClass.weapon).toMatch(/sword|staff|bow/);
      expect(heroClass.flavour).toBeDefined();
      expect(heroClass.passive).toBeDefined();
      expect(heroClass.passive.id).toBeDefined();
      expect(heroClass.passive.name).toBeDefined();
      expect(heroClass.passive.text).toBeDefined();
      expect(heroClass.special).toBeDefined();
      expect(heroClass.special.id).toBeDefined();
      expect(heroClass.special.name).toBeDefined();
      expect(heroClass.special.text).toBeDefined();
      expect(heroClass.special.chargeNeeded).toBeGreaterThan(0);
      expect(heroClass.special.maxUses).toBeGreaterThan(0);
      expect(heroClass.favouredRealms).toBeDefined();
      expect(Array.isArray(heroClass.favouredRealms)).toBe(true);
      expect(heroClass.favouredRealms.length).toBeGreaterThan(0);
    }
  });

  it("every class has unique weapon types", () => {
    const weapons = Object.values(HERO_CLASSES).map((c) => c.weapon);
    expect(new Set(weapons).size).toBe(3);
  });

  it("every class has unique passive ids", () => {
    const passiveIds = Object.values(HERO_CLASSES).map((c) => c.passive.id);
    expect(new Set(passiveIds).size).toBe(3);
  });

  it("every class has unique special ids", () => {
    const specialIds = Object.values(HERO_CLASSES).map((c) => c.special.id);
    expect(new Set(specialIds).size).toBe(3);
  });
});

describe("realm coverage", () => {
  it("every realm appears in exactly one class's favouredRealms", () => {
    const { valid, errors } = validateHeroRealmCoverage();
    // All 6 realms are covered exactly once (distribution doesn't matter)
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
  });

  it("6 realms total are covered", () => {
    const allRealms = new Set<string>();
    for (const heroClass of Object.values(HERO_CLASSES)) {
      for (const realm of heroClass.favouredRealms) {
        allRealms.add(realm);
      }
    }
    expect(allRealms.size).toBe(6);
  });
});

describe("DEFAULT_HERO_NAMES", () => {
  it("has names for all 6 hero combinations", () => {
    const classIds: ClassId[] = ["knight", "mage", "ranger"];
    const variants: Variant[] = ["boy", "girl"];
    for (const classId of classIds) {
      for (const variant of variants) {
        expect(DEFAULT_HERO_NAMES[classId][variant]).toBeDefined();
        expect(typeof DEFAULT_HERO_NAMES[classId][variant]).toBe("string");
      }
    }
  });

  it("all names are unique", () => {
    const names: string[] = [];
    for (const classNames of Object.values(DEFAULT_HERO_NAMES)) {
      for (const name of Object.values(classNames)) {
        names.push(name);
      }
    }
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("getDefaultHeroName", () => {
  it("returns the correct default name", () => {
    expect(getDefaultHeroName("knight", "boy")).toBe("Aric");
    expect(getDefaultHeroName("knight", "girl")).toBe("Brenna");
    expect(getDefaultHeroName("mage", "boy")).toBe("Eli");
    expect(getDefaultHeroName("mage", "girl")).toBe("Mira");
    expect(getDefaultHeroName("ranger", "boy")).toBe("Finn");
    expect(getDefaultHeroName("ranger", "girl")).toBe("Lyra");
  });
});

describe("getHeroesByVariant", () => {
  it("returns 3 heroes for boy variant", () => {
    const heroes = getHeroesByVariant("boy");
    expect(heroes).toHaveLength(3);
    expect(heroes.every((h) => h.variant === "boy")).toBe(true);
  });

  it("returns 3 heroes for girl variant", () => {
    const heroes = getHeroesByVariant("girl");
    expect(heroes).toHaveLength(3);
    expect(heroes.every((h) => h.variant === "girl")).toBe(true);
  });

  it("returns all 6 heroes for any variant", () => {
    const heroes = getHeroesByVariant("any");
    expect(heroes).toHaveLength(6);
  });

  it("returns heroes with correct classIds", () => {
    const heroes = getHeroesByVariant("any");
    const classIds = new Set(heroes.map((h) => h.classId));
    expect(classIds).toEqual(new Set(["knight", "mage", "ranger"]));
  });
});

describe("heroSlotId", () => {
  it("produces correct slot ids", () => {
    expect(heroSlotId({ classId: "knight", variant: "boy" })).toBe("hero-knight-boy");
    expect(heroSlotId({ classId: "mage", variant: "girl" })).toBe("hero-mage-girl");
    expect(heroSlotId({ classId: "ranger", variant: "boy" })).toBe("hero-ranger-boy");
  });

  it("produces unique slot ids for all 6 heroes", () => {
    const heroes = getHeroesByVariant("any");
    const slots = heroes.map(heroSlotId);
    expect(new Set(slots).size).toBe(6);
  });
});

describe("heroPortraitSlotId", () => {
  it("produces correct portrait slot ids", () => {
    expect(heroPortraitSlotId({ classId: "knight", variant: "boy" })).toBe(
      "hero-knight-boy-portrait"
    );
    expect(heroPortraitSlotId({ classId: "mage", variant: "girl" })).toBe(
      "hero-mage-girl-portrait"
    );
  });

  it("produces unique portrait slot ids for all 6 heroes", () => {
    const heroes = getHeroesByVariant("any");
    const slots = heroes.map(heroPortraitSlotId);
    expect(new Set(slots).size).toBe(6);
  });
});

describe("getHeroClass", () => {
  it("returns the correct class definition", () => {
    const knight = getHeroClass("knight");
    expect(knight.displayName).toBe("Knight");
    expect(knight.weapon).toBe("sword");

    const mage = getHeroClass("mage");
    expect(mage.displayName).toBe("Mage");
    expect(mage.weapon).toBe("staff");

    const ranger = getHeroClass("ranger");
    expect(ranger.displayName).toBe("Ranger");
    expect(ranger.weapon).toBe("bow");
  });
});

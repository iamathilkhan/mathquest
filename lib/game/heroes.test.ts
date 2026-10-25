/**
 * lib/game/heroes.test.ts
 *
 * Tests for pure hero logic: multipliers, weapon tiers, display names.
 */
import { describe, it, expect } from "vitest";
import {
  favouredMultiplier,
  weaponTier,
  weaponName,
  xpMultiplier,
  heroDisplayName,
} from "./heroes";

describe("favouredMultiplier", () => {
  it("returns 1.5 for knight in fractions realm", () => {
    expect(favouredMultiplier("knight", "g5-fractions")).toBe(1.5);
  });

  it("returns 1.5 for mage in ratios realm", () => {
    expect(favouredMultiplier("mage", "g6-ratios")).toBe(1.5);
  });

  it("returns 1.5 for ranger in volume realm", () => {
    expect(favouredMultiplier("ranger", "g5-volume")).toBe(1.5);
  });

  it("returns 1 for knight in non-favoured realm", () => {
    expect(favouredMultiplier("knight", "g6-ratios")).toBe(1);
  });

  it("returns 1 for mage in non-favoured realm", () => {
    expect(favouredMultiplier("mage", "g5-fractions")).toBe(1);
  });

  it("returns 1 for ranger in non-favoured realm", () => {
    expect(favouredMultiplier("ranger", "g5-decimals")).toBe(1);
  });
});

describe("weaponTier", () => {
  it("returns 1 for level 1", () => {
    expect(weaponTier(1)).toBe(1);
  });

  it("returns 1 for level 4", () => {
    expect(weaponTier(4)).toBe(1);
  });

  it("returns 2 for level 5", () => {
    expect(weaponTier(5)).toBe(2);
  });

  it("returns 2 for level 9", () => {
    expect(weaponTier(9)).toBe(2);
  });

  it("returns 3 for level 10", () => {
    expect(weaponTier(10)).toBe(3);
  });

  it("returns 3 for level 20", () => {
    expect(weaponTier(20)).toBe(3);
  });
});

describe("weaponName", () => {
  it("returns correct sword names", () => {
    expect(weaponName("sword", 1)).toBe("Wooden Sword");
    expect(weaponName("sword", 2)).toBe("Iron Sword");
    expect(weaponName("sword", 3)).toBe("Silver Sword");
  });

  it("returns correct staff names", () => {
    expect(weaponName("staff", 1)).toBe("Oak Staff");
    expect(weaponName("staff", 2)).toBe("Crystal Staff");
    expect(weaponName("staff", 3)).toBe("Star Staff");
  });

  it("returns correct bow names", () => {
    expect(weaponName("bow", 1)).toBe("Short Bow");
    expect(weaponName("bow", 2)).toBe("Long Bow");
    expect(weaponName("bow", 3)).toBe("Moon Bow");
  });
});

describe("xpMultiplier", () => {
  it("returns 1.15 for ranger", () => {
    expect(xpMultiplier("ranger")).toBe(1.15);
  });

  it("returns 1 for knight", () => {
    expect(xpMultiplier("knight")).toBe(1);
  });

  it("returns 1 for mage", () => {
    expect(xpMultiplier("mage")).toBe(1);
  });
});

describe("heroDisplayName", () => {
  it("uses custom name when provided and non-empty", () => {
    expect(heroDisplayName("Alice", { classId: "knight", variant: "girl" })).toBe("Alice");
    expect(heroDisplayName("  Bob  ", { classId: "mage", variant: "boy" })).toBe("Bob");
  });

  it("uses default name when custom name is empty", () => {
    expect(heroDisplayName("", { classId: "knight", variant: "boy" })).toBe("Aric");
    expect(heroDisplayName("   ", { classId: "mage", variant: "girl" })).toBe("Mira");
  });

  it("uses default name when custom name is undefined", () => {
    expect(heroDisplayName(undefined, { classId: "ranger", variant: "boy" })).toBe("Finn");
  });

  it("uses default name when hero is null", () => {
    expect(heroDisplayName("", null)).toBe("Number Knight");
    expect(heroDisplayName(undefined, null)).toBe("Number Knight");
  });

  it("uses custom name even if hero is null", () => {
    expect(heroDisplayName("Xavier", null)).toBe("Xavier");
  });
});

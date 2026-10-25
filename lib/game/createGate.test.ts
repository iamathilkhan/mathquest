/**
 * lib/game/createGate.test.ts
 *
 * Tests for hero creation redirect logic.
 */
import { describe, it, expect } from "vitest";
import { shouldRedirectToCreate } from "./createGate";
import type { Player } from "@/lib/schemas";

const createPlayer = (overrides?: Partial<Player>): Player => ({
  profile: { name: "Test", grade: 5 },
  grade: 5,
  level: 1,
  xp: 0,
  coins: 0,
  realms: {},
  skill: {},
  subSkillStats: {},
  badges: [],
  streak: 0,
  ...overrides,
});

describe("shouldRedirectToCreate", () => {
  it("returns false for new player (no save)", () => {
    const result = shouldRedirectToCreate(null, false, false);
    expect(result).toBe(false);
  });

  it("returns false if no valid player", () => {
    const result = shouldRedirectToCreate(null, true, false);
    expect(result).toBe(false);
  });

  it("returns false if already redirected once", () => {
    const player = createPlayer();
    const result = shouldRedirectToCreate(player, true, true);
    expect(result).toBe(false);
  });

  it("returns false if hero is already chosen", () => {
    const player = createPlayer({
      hero: { classId: "knight", variant: "boy" },
    });
    const result = shouldRedirectToCreate(player, true, false);
    expect(result).toBe(false);
  });

  it("returns true for v1 save with no hero and not yet redirected", () => {
    const player = createPlayer({ hero: undefined });
    const result = shouldRedirectToCreate(player, true, false);
    expect(result).toBe(true);
  });

  it("returns true for v1 save with hero undefined and not yet redirected", () => {
    const basePlayer = createPlayer();
    const playerWithoutHero = { ...basePlayer } as Partial<Player>;
    delete playerWithoutHero.hero;
    const result = shouldRedirectToCreate(playerWithoutHero as Player, true, false);
    expect(result).toBe(true);
  });
});

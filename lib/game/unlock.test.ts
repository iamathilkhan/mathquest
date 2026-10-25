import { describe, it, expect } from "vitest";
import { isRealmUnlocked, isStageUnlocked, lockReason } from "./unlock";
import { getRealm } from "@/data/curriculum";
import type { Player } from "@/lib/schemas";

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    level: 1,
    xp: 0,
    coins: 0,
    realms: {},
    skill: {},
    subSkillStats: {},
    badges: [],
    streak: 0,
    settings: {
      demoMode: false,
      readableFont: false,
      reducedMotion: false,
      sfxEnabled: true,
    },
    ...overrides,
  };
}

describe("unlock logic", () => {
  const g5Fractions = getRealm("g5-fractions");
  const g5Decimals = getRealm("g5-decimals");
  const g6Ratios = getRealm("g6-ratios");

  describe("Realm Unlocks", () => {
    it("unlocks first realm of Grade 5 by default", () => {
      const player = makePlayer({ level: 1 });
      expect(isRealmUnlocked(player, g5Fractions)).toBe(true);
      expect(lockReason(player, g5Fractions)).toBeNull();
    });

    it("locks second realm of Grade 5 until first realm boss is defeated", () => {
      const player = makePlayer({ level: 1 });
      expect(isRealmUnlocked(player, g5Decimals)).toBe(false);
      expect(lockReason(player, g5Decimals)).toContain("Defeat the Fraction Warden first");

      const playerWithBoss = makePlayer({
        realms: {
          "g5-fractions": { stars: [3, 3, 3, 3, 3], bossDefeated: true },
        },
      });
      expect(isRealmUnlocked(playerWithBoss, g5Decimals)).toBe(true);
      expect(lockReason(playerWithBoss, g5Decimals)).toBeNull();
    });

    it("gates Grade 6 realms behind GRADE6_UNLOCK_LEVEL", () => {
      const playerLevel1 = makePlayer({ level: 1 });
      // When GRADE6_UNLOCK_LEVEL is configured to 4:
      expect(isRealmUnlocked(playerLevel1, g6Ratios, { grade6UnlockLevel: 4 })).toBe(false);
      expect(lockReason(playerLevel1, g6Ratios, { grade6UnlockLevel: 4 })).toBe(
        "Reach Level 4 to enter Grade 6 realms"
      );

      const playerLevel4 = makePlayer({ level: 4 });
      expect(isRealmUnlocked(playerLevel4, g6Ratios, { grade6UnlockLevel: 4 })).toBe(true);
    });

    it("unlocks everything when demoMode is active", () => {
      const playerDemo = makePlayer({
        settings: { demoMode: true, readableFont: false, reducedMotion: false, sfxEnabled: true },
      });
      expect(isRealmUnlocked(playerDemo, g5Decimals)).toBe(true);
      expect(isRealmUnlocked(playerDemo, g6Ratios, { grade6UnlockLevel: 10 })).toBe(true);
      expect(isStageUnlocked(playerDemo, "g5-decimals", 4)).toBe(true);
    });
  });

  describe("Stage Unlocks", () => {
    it("stage 0 is unlocked if the realm is unlocked", () => {
      const player = makePlayer();
      expect(isStageUnlocked(player, "g5-fractions", 0)).toBe(true);
    });

    it("stage i requires stage i-1 to be cleared with at least 1 star", () => {
      const player = makePlayer({
        realms: {
          "g5-fractions": { stars: [-1, -1, -1, -1, -1], bossDefeated: false },
        },
      });
      expect(isStageUnlocked(player, "g5-fractions", 1)).toBe(false);

      const playerStage0Cleared = makePlayer({
        realms: {
          "g5-fractions": { stars: [1, -1, -1, -1, -1], bossDefeated: false },
        },
      });
      expect(isStageUnlocked(playerStage0Cleared, "g5-fractions", 1)).toBe(true);
      expect(isStageUnlocked(playerStage0Cleared, "g5-fractions", 2)).toBe(false);
    });

    it("boss stage (stageIndex 4) requires stages 0-3 to all be cleared", () => {
      const playerAlmost = makePlayer({
        realms: {
          "g5-fractions": { stars: [3, 2, 1, -1, -1], bossDefeated: false },
        },
      });
      expect(isStageUnlocked(playerAlmost, "g5-fractions", 4)).toBe(false);

      const playerReadyForBoss = makePlayer({
        realms: {
          "g5-fractions": { stars: [3, 2, 1, 1, -1], bossDefeated: false },
        },
      });
      expect(isStageUnlocked(playerReadyForBoss, "g5-fractions", 4)).toBe(true);
    });
  });
});

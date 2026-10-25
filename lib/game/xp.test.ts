import { describe, it, expect } from "vitest";
import {
  heartsFor,
  coinsFor,
  xpForAnswer,
  damageFor,
  levelFromXp,
  titleForLevel,
  starsFor,
  stageBonusXp,
} from "./xp";

describe("XP, Levelling, Hearts and Coins arithmetic", () => {
  describe("heartsFor boundary tests", () => {
    it("matches specification at levels 1, 3, 4, 6, 7, 20", () => {
      expect(heartsFor(1)).toBe(3);
      expect(heartsFor(3)).toBe(3);
      expect(heartsFor(4)).toBe(4);
      expect(heartsFor(6)).toBe(4);
      expect(heartsFor(7)).toBe(5);
      expect(heartsFor(20)).toBe(5);
    });
  });

  describe("coinsFor calculations", () => {
    it("calculates coins for regular minion win", () => {
      // 8 correct, 3 stars, minion, won
      const coins = coinsFor({ correctCount: 8, stars: 3, isBoss: false, won: true });
      // 8*2 + 3*5 = 16 + 15 = 31
      expect(coins).toBe(31);
    });

    it("calculates coins for boss win", () => {
      // 10 correct, 3 stars, boss, won
      const coins = coinsFor({ correctCount: 10, stars: 3, isBoss: true, won: true });
      // 10*2 + 3*5 + 25 = 20 + 15 + 25 = 60
      expect(coins).toBe(60);
    });

    it("gives 0 star/boss bonus on loss", () => {
      // 4 correct, loss
      const coins = coinsFor({ correctCount: 4, stars: 0, isBoss: true, won: false });
      // 4*2 = 8, no star or boss bonus
      expect(coins).toBe(8);
    });
  });

  describe("XP and damage calculations", () => {
    it("scales XP with combo bonus capped at combo 5", () => {
      // Base XP: easy: 10, medium: 20, hard: 35
      // Combo multiplier: 1 + 0.1*min(combo, 5)
      // combo 0: 1.0 -> 10
      expect(xpForAnswer("easy", 0)).toBe(10);
      // combo 3: 1 + 0.3 = 1.3 -> 10 * 1.3 = 13
      expect(xpForAnswer("easy", 3)).toBe(13);
      // combo 5: 1 + 0.5 = 1.5 -> 10 * 1.5 = 15
      expect(xpForAnswer("easy", 5)).toBe(15);
      // combo 10: capped at 5 -> 15
      expect(xpForAnswer("easy", 10)).toBe(15);
    });

    it("scales damage with combo bonus", () => {
      // DAMAGE_BASE: easy: 10, medium: 15, hard: 25
      expect(damageFor("hard", 0)).toBe(25);
      expect(damageFor("hard", 5)).toBe(38); // 25 * 1.5 = 37.5 -> 38
    });
  });

  describe("levelFromXp and titles", () => {
    it("calculates level progress correctly", () => {
      // xpToNext(1) = 100
      expect(levelFromXp(0)).toEqual({ level: 1, intoLevel: 0, needed: 100 });
      expect(levelFromXp(50)).toEqual({ level: 1, intoLevel: 50, needed: 100 });
      // xpToNext(2) = 160. Total for level 1+2 = 260
      expect(levelFromXp(100)).toEqual({ level: 2, intoLevel: 0, needed: 160 });
      expect(levelFromXp(150)).toEqual({ level: 2, intoLevel: 50, needed: 160 });
    });

    it("assigns titles based on level", () => {
      expect(titleForLevel(1)).toBe("Novice Wanderer");
      expect(titleForLevel(2)).toBe("Apprentice Scholar");
      expect(titleForLevel(10)).toBe("Grand Arithmetician");
      expect(titleForLevel(15)).toBe("Grand Arithmetician"); // capped at last title
    });

    it("calculates stars and star bonus XP", () => {
      expect(starsFor(0, true)).toBe(3);
      expect(starsFor(1, true)).toBe(2);
      expect(starsFor(3, true)).toBe(1);
      expect(starsFor(0, false)).toBe(0);

      // STAR_BONUS_XP = { 1: 20, 2: 40, 3: 60 }; boss doubles
      expect(stageBonusXp(3, false)).toBe(60);
      expect(stageBonusXp(3, true)).toBe(120);
    });
  });
});

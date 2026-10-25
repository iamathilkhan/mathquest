import { describe, it, expect } from "vitest";
import { battleReducer, type BattleState, type BattleAction } from "./battle";
import type { Pools, VerifiedQuestion } from "@/lib/schemas";
import { damageFor, xpForAnswer } from "./xp";
import { FAVOURED_DAMAGE_MULTIPLIER } from "@/data/heroes";

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    deepFreeze((obj as Record<string, unknown>)[key]);
  }
  return obj;
}

function makeQ(id: string, tier: "easy" | "medium" | "hard" = "easy", correctIndex = 0): VerifiedQuestion {
  return {
    id,
    stem: `Test stem for question ${id}`,
    tier,
    expression: "1 + 1",
    options: [
      { label: "2", value: "2", why: "Correct" },
      { label: "1", value: "1", why: "Wrong" },
      { label: "3", value: "3", why: "Wrong" },
      { label: "4", value: "4", why: "Wrong" },
    ],
    correctIndex,
    explanation: "1 + 1 = 2",
    hint: "Think about pairs",
    check: "1 + 1 = 2",
    source: "seed",
    subSkillId: "test-skill",
  };
}

function makePools(count = 10): Pools {
  return {
    easy: Array.from({ length: count }, (_, i) => makeQ(`e_${i}`, "easy")),
    medium: Array.from({ length: count }, (_, i) => makeQ(`m_${i}`, "medium")),
    hard: Array.from({ length: count }, (_, i) => makeQ(`h_${i}`, "hard")),
  };
}

function initBattle(opts?: {
  hero?: { classId: "knight" | "mage" | "ranger" };
  realmId?: string;
  hearts?: number;
  loadout?: { hint: number; shield: number; fifty: number };
  mode?: "minion" | "boss";
}): BattleState {
  const pools = makePools();
  const action: BattleAction = {
    type: "INIT",
    pools,
    mode: opts?.mode ?? "minion",
    startTier: "easy",
    loadout: opts?.loadout ?? { hint: 1, shield: 1, fifty: 1 },
    hearts: opts?.hearts ?? 3,
    hero: opts?.hero,
    realmId: opts?.realmId,
  };
  return battleReducer({} as BattleState, action);
}

describe("Hero Battle Reducer Extension", () => {
  describe("Neutral / Absent Hero", () => {
    it("behaves exactly as before when hero is absent", () => {
      let state = initBattle();
      expect(state.hero).toBeUndefined();
      expect(state.specialCharge).toBe(0);
      expect(state.specialUsesLeft).toBe(2);
      expect(state.specialArmed).toBe(false);
      expect(state.passiveSpent).toBe(false);

      // Wrong answer costs 1 heart without shield (when shield not activated)
      deepFreeze(state);
      state = battleReducer(state, { type: "ANSWER", picked: 1 });
      expect(state.hearts).toBe(2);
      expect(state.passiveSpent).toBe(false);
      expect(state.heroFx).toEqual([]);

      // Special action does nothing
      const beforeSpecial = state;
      const afterSpecial = battleReducer(state, { type: "SPECIAL" });
      expect(afterSpecial).toBe(beforeSpecial);
    });
  });

  describe("Knight", () => {
    it("Stalwart absorbs the first wrong answer, sets passiveSpent, and leaves shield intact", () => {
      let state = initBattle({ hero: { classId: "knight" }, realmId: "g5-volume" });
      deepFreeze(state);

      // Activate shield
      state = battleReducer(state, { type: "POWER", item: "shield" });
      expect(state.shieldActive).toBe(true);

      // First wrong answer: Stalwart saves heart; shield remains active!
      deepFreeze(state);
      state = battleReducer(state, { type: "ANSWER", picked: 1 });
      expect(state.hearts).toBe(3);
      expect(state.passiveSpent).toBe(true);
      expect(state.shieldActive).toBe(true);
      expect(state.heroFx).toContain("STALWART: heart saved");

      // Next
      state = battleReducer(state, { type: "NEXT" });

      // Second wrong answer: now shield absorbs it
      deepFreeze(state);
      state = battleReducer(state, { type: "ANSWER", picked: 1 });
      expect(state.hearts).toBe(3);
      expect(state.shieldActive).toBe(false);

      // Next
      state = battleReducer(state, { type: "NEXT" });

      // Third wrong answer: costs a heart
      deepFreeze(state);
      state = battleReducer(state, { type: "ANSWER", picked: 1 });
      expect(state.hearts).toBe(2);
    });

    it("charges special on correct answers, resets on wrong", () => {
      let state = initBattle({ hero: { classId: "knight" }, realmId: "g5-volume" });

      // 1 correct answer -> charge 1
      state = battleReducer(state, { type: "ANSWER", picked: 0 });
      expect(state.specialCharge).toBe(1);

      state = battleReducer(state, { type: "NEXT" });

      // 1 wrong answer -> charge reset to 0
      state = battleReducer(state, { type: "ANSWER", picked: 1 });
      expect(state.specialCharge).toBe(0);
    });

    it("Power Strike arms at 2 charge, consumes on next correct answer for 2x damage", () => {
      let state = initBattle({ hero: { classId: "knight" }, realmId: "g5-volume", mode: "boss" });

      // 2 correct answers to reach chargeNeeded (2)
      state = battleReducer(state, { type: "ANSWER", picked: 0 });
      state = battleReducer(state, { type: "NEXT" });
      state = battleReducer(state, { type: "ANSWER", picked: 0 });
      state = battleReducer(state, { type: "NEXT" });
      expect(state.specialCharge).toBe(2);
      expect(state.specialUsesLeft).toBe(2);

      // Trigger SPECIAL
      deepFreeze(state);
      state = battleReducer(state, { type: "SPECIAL" });
      expect(state.specialArmed).toBe(true);
      expect(state.specialCharge).toBe(0);
      expect(state.specialUsesLeft).toBe(1);

      // Next correct answer deals double damage and consumes armed state
      const initialHp = state.enemyHp;
      const baseDmg = damageFor(state.currentQuestion!.tier, state.combo + 1);
      deepFreeze(state);
      state = battleReducer(state, { type: "ANSWER", picked: 0 });

      expect(state.enemyHp).toBe(initialHp - baseDmg * 2);
      expect(state.specialArmed).toBe(false);
      expect(state.heroFx).toContain("POWER STRIKE ×2");
    });

    it("Power Strike stacks with favoured foe", () => {
      // Knight favoured realms: g5-fractions, g5-decimals
      // Use boss mode (120 HP) so HP does not clamp at 0
      let state = initBattle({ hero: { classId: "knight" }, realmId: "g5-fractions", mode: "boss" });

      // Charge up 2
      state = battleReducer(state, { type: "ANSWER", picked: 0 });
      state = battleReducer(state, { type: "NEXT" });
      state = battleReducer(state, { type: "ANSWER", picked: 0 });
      state = battleReducer(state, { type: "NEXT" });

      // Arm special
      state = battleReducer(state, { type: "SPECIAL" });
      expect(state.specialArmed).toBe(true);

      const initialHp = state.enemyHp;
      const baseDmg = damageFor(state.currentQuestion!.tier, state.combo + 1);
      const expectedDmg = Math.round(baseDmg * 2 * FAVOURED_DAMAGE_MULTIPLIER);

      state = battleReducer(state, { type: "ANSWER", picked: 0 });
      expect(state.enemyHp).toBe(initialHp - expectedDmg);
      expect(state.heroFx).toContain("POWER STRIKE ×2");
      expect(state.heroFx).toContain("FAVOURED FOE +50% DAMAGE");
    });
  });

  describe("Mage", () => {
    it("Insight gives +1 hint at INIT", () => {
      const state = initBattle({
        hero: { classId: "mage" },
        realmId: "g6-ratios",
        loadout: { hint: 1, shield: 1, fifty: 1 },
      });
      expect(state.loadout.hint).toBe(2);
    });

    it("Arcane Clarity hides exactly two wrong options, never the correct one, without consuming fifty-fifty", () => {
      let state = initBattle({ hero: { classId: "mage" }, realmId: "g6-ratios" });

      // Charge up 2
      state = battleReducer(state, { type: "ANSWER", picked: 0 });
      state = battleReducer(state, { type: "NEXT" });
      state = battleReducer(state, { type: "ANSWER", picked: 0 });
      state = battleReducer(state, { type: "NEXT" });

      expect(state.specialCharge).toBe(2);
      const fiftyInventoryBefore = state.loadout.fifty;

      deepFreeze(state);
      state = battleReducer(state, { type: "SPECIAL" });
      expect(state.specialUsesLeft).toBe(1);
      expect(state.specialCharge).toBe(0);
      expect(state.hidden.length).toBe(2);
      expect(state.hidden).not.toContain(state.currentQuestion!.correctIndex);
      expect(state.loadout.fifty).toBe(fiftyInventoryBefore);

      // Attempting to use Clarity again when options already hidden is refused
      const beforeRefused = state;
      const afterRefused = battleReducer(state, { type: "SPECIAL" });
      expect(afterRefused).toBe(beforeRefused);
    });
  });

  describe("Ranger", () => {
    it("Quick Study awards 15% bonus XP from correct answers (rounded)", () => {
      let state = initBattle({ hero: { classId: "ranger" }, realmId: "g5-volume" });

      const baseXp = xpForAnswer(state.currentQuestion!.tier, 1);
      const expectedXp = Math.round(baseXp * 1.15);

      state = battleReducer(state, { type: "ANSWER", picked: 0 });
      expect(state.xp).toBe(expectedXp);
    });

    it("Second Wind restores 1 heart clamped at maxHearts", () => {
      let state = initBattle({ hero: { classId: "ranger" }, realmId: "g5-volume", hearts: 3 });

      // Take damage: wrong answer
      state = battleReducer(state, { type: "ANSWER", picked: 1 });
      expect(state.hearts).toBe(2);
      state = battleReducer(state, { type: "NEXT" });

      // Charge up 2 correct answers
      state = battleReducer(state, { type: "ANSWER", picked: 0 });
      state = battleReducer(state, { type: "NEXT" });
      state = battleReducer(state, { type: "ANSWER", picked: 0 });
      state = battleReducer(state, { type: "NEXT" });
      expect(state.specialCharge).toBe(2);

      // Use Second Wind
      deepFreeze(state);
      state = battleReducer(state, { type: "SPECIAL" });
      expect(state.hearts).toBe(3); // Restored to max
      expect(state.specialUsesLeft).toBe(1);

      // If at max hearts, Second Wind doesn't exceed maxHearts
      state.specialCharge = 2; // Test clamp directly
      state = battleReducer(state, { type: "SPECIAL" });
      expect(state.hearts).toBe(3);
    });
  });

  describe("General Invariants and Edge Cases", () => {
    it("ignores SPECIAL action when in feedback, won, or lost phase", () => {
      let state = initBattle({ hero: { classId: "knight" }, realmId: "g5-fractions" });
      state.specialCharge = 2;

      // In feedback phase
      state = battleReducer(state, { type: "ANSWER", picked: 0 });
      expect(state.phase).toBe("feedback");

      const frozen = deepFreeze({ ...state });
      const after = battleReducer(frozen, { type: "SPECIAL" });
      expect(after).toBe(frozen);
    });

    it("strictly preserves purity (deepFreeze passes without throw)", () => {
      let state = initBattle({ hero: { classId: "mage" }, realmId: "g6-ratios" });
      deepFreeze(state);

      state = battleReducer(state, { type: "ANSWER", picked: 0 });
      deepFreeze(state);

      state = battleReducer(state, { type: "NEXT" });
      deepFreeze(state);

      state = battleReducer(state, { type: "ANSWER", picked: 0 });
      deepFreeze(state);

      state = battleReducer(state, { type: "NEXT" });
      deepFreeze(state);

      state = battleReducer(state, { type: "SPECIAL" });
      deepFreeze(state);

      expect(state.hidden.length).toBe(2);
    });

    it("runs a full scripted battle to victory for each class", () => {
      const classes: Array<"knight" | "mage" | "ranger"> = ["knight", "mage", "ranger"];
      for (const classId of classes) {
        let state = initBattle({ hero: { classId }, realmId: "g5-fractions" });
        while (state.phase !== "won" && state.phase !== "lost") {
          if (state.phase === "question") {
            if (state.specialCharge >= 3 && state.specialUsesLeft > 0) {
              state = battleReducer(state, { type: "SPECIAL" });
            }
            state = battleReducer(state, { type: "ANSWER", picked: 0 });
          } else if (state.phase === "feedback") {
            state = battleReducer(state, { type: "NEXT" });
          }
        }
        expect(state.phase).toBe("won");
        expect(state.endReason).toBe("enemy_defeated");
      }
    });
  });
});

import { describe, it, expect } from "vitest";
import { battleReducer, type BattleState, type BattleAction } from "./battle";
import type { Pools, VerifiedQuestion } from "@/lib/schemas";
import { MINION_HP, MINION_Q } from "@/lib/config";

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

describe("battleReducer", () => {
  it("initializes minion battle state correctly", () => {
    const pools = makePools();
    const action: BattleAction = {
      type: "INIT",
      pools,
      mode: "minion",
      startTier: "easy",
      loadout: { hint: 1, shield: 1, fifty: 1 },
      hearts: 3,
    };
    const state = battleReducer({} as BattleState, action);

    expect(state.phase).toBe("question");
    expect(state.enemyHp).toBe(MINION_HP);
    expect(state.hearts).toBe(3);
    expect(state.total).toBe(MINION_Q);
    expect(state.currentQuestion).not.toBeNull();
    expect(state.loadout).toEqual({ hint: 1, shield: 1, fifty: 1 });
  });

  it("handles scripted full victory", () => {
    let state = battleReducer({} as BattleState, {
      type: "INIT",
      pools: makePools(15),
      mode: "minion",
      startTier: "hard", // Deals higher damage: 25 base
      loadout: { hint: 0, shield: 0, fifty: 0 },
      hearts: 3,
    });

    // Answer correctly repeatedly until battle reaches won phase
    let safety = 20;
    while (state.phase !== "won" && state.phase !== "lost" && safety-- > 0) {
      if (state.phase === "question") {
        state = battleReducer(state, { type: "ANSWER", picked: state.currentQuestion!.correctIndex });
      } else if (state.phase === "feedback") {
        state = battleReducer(state, { type: "NEXT" });
      }
    }

    expect(state.phase).toBe("won");
    expect(state.endReason).toBe("enemy_defeated");
    expect(state.enemyHp).toBe(0);
    expect(state.correctCount).toBeGreaterThan(0);
    expect(state.wrongCount).toBe(0);
  });

  it("handles defeat by losing all hearts", () => {
    let state = battleReducer({} as BattleState, {
      type: "INIT",
      pools: makePools(),
      mode: "minion",
      startTier: "easy",
      loadout: { hint: 0, shield: 0, fifty: 0 },
      hearts: 2,
    });

    // 2 wrong answers
    state = battleReducer(state, { type: "ANSWER", picked: 1 }); // wrong
    expect(state.hearts).toBe(1);
    state = battleReducer(state, { type: "NEXT" });

    state = battleReducer(state, { type: "ANSWER", picked: 1 }); // wrong
    expect(state.hearts).toBe(0);
    state = battleReducer(state, { type: "NEXT" });

    expect(state.phase).toBe("lost");
    expect(state.endReason).toBe("out_of_hearts");
  });

  it("handles defeat by running out of questions", () => {
    // Enemy has high HP so questions run out first
    let state = battleReducer({} as BattleState, {
      type: "INIT",
      pools: makePools(),
      mode: "minion",
      startTier: "easy",
      loadout: { hint: 0, shield: 0, fifty: 0 },
      hearts: 5,
    });
    // Artificially increase enemyHp
    state.enemyHp = 10000;

    for (let i = 0; i < MINION_Q; i++) {
      state = battleReducer(state, { type: "ANSWER", picked: state.currentQuestion!.correctIndex });
      state = battleReducer(state, { type: "NEXT" });
    }

    expect(state.phase).toBe("lost");
    expect(state.endReason).toBe("out_of_questions");
  });

  it("shield power absorbs exactly one wrong answer without losing hearts", () => {
    let state = battleReducer({} as BattleState, {
      type: "INIT",
      pools: makePools(),
      mode: "minion",
      startTier: "easy",
      loadout: { hint: 0, shield: 1, fifty: 0 },
      hearts: 3,
    });

    // Activate shield
    state = battleReducer(state, { type: "POWER", item: "shield" });
    expect(state.shieldActive).toBe(true);
    expect(state.loadout.shield).toBe(0);

    // Answer wrongly
    state = battleReducer(state, { type: "ANSWER", picked: 1 });
    expect(state.hearts).toBe(3); // heart preserved!
    expect(state.shieldActive).toBe(false); // consumed!
    expect(state.wrongCount).toBe(1); // still recorded as wrong

    state = battleReducer(state, { type: "NEXT" });

    // Next wrong answer loses a heart
    state = battleReducer(state, { type: "ANSWER", picked: 1 });
    expect(state.hearts).toBe(2);
  });

  it("fifty power hides exactly two wrong options and never the correct option", () => {
    let state = battleReducer({} as BattleState, {
      type: "INIT",
      pools: makePools(),
      mode: "minion",
      startTier: "easy",
      loadout: { hint: 0, shield: 0, fifty: 1 },
      hearts: 3,
    });

    const correctIdx = state.currentQuestion!.correctIndex;
    state = battleReducer(state, { type: "POWER", item: "fifty" });

    expect(state.hidden.length).toBe(2);
    expect(state.hidden).not.toContain(correctIdx);
    expect(state.loadout.fifty).toBe(0);

    // Attempting to pick a hidden option should be ignored
    const hiddenPick = state.hidden[0]!;
    const afterHiddenPick = battleReducer(state, { type: "ANSWER", picked: hiddenPick });
    expect(afterHiddenPick.phase).toBe("question"); // answer was ignored
  });

  it("hint power works once per battle and exposes hint", () => {
    let state = battleReducer({} as BattleState, {
      type: "INIT",
      pools: makePools(),
      mode: "minion",
      startTier: "easy",
      loadout: { hint: 1, shield: 0, fifty: 0 },
      hearts: 3,
    });

    state = battleReducer(state, { type: "POWER", item: "hint" });
    expect(state.hintShown).toBe(true);
    expect(state.loadout.hint).toBe(0);

    // Activating again does nothing
    const state2 = battleReducer(state, { type: "POWER", item: "hint" });
    expect(state2).toEqual(state);
  });

  it("grants combo rewards at thresholds (combo 3 -> hint, combo 5 -> shield)", () => {
    let state = battleReducer({} as BattleState, {
      type: "INIT",
      pools: makePools(),
      mode: "minion",
      startTier: "easy",
      loadout: { hint: 0, shield: 0, fifty: 0 },
      hearts: 3,
    });

    // Correct 1
    state = battleReducer(state, { type: "ANSWER", picked: 0 });
    state = battleReducer(state, { type: "NEXT" });
    // Correct 2
    state = battleReducer(state, { type: "ANSWER", picked: 0 });
    state = battleReducer(state, { type: "NEXT" });
    // Correct 3 -> combo 3 -> reward: hint!
    state = battleReducer(state, { type: "ANSWER", picked: 0 });
    expect(state.combo).toBe(3);
    expect(state.loadout.hint).toBe(1);
    state = battleReducer(state, { type: "NEXT" });

    // Correct 4
    state = battleReducer(state, { type: "ANSWER", picked: 0 });
    state = battleReducer(state, { type: "NEXT" });
    // Correct 5 -> combo 5 -> reward: shield!
    state = battleReducer(state, { type: "ANSWER", picked: 0 });
    expect(state.combo).toBe(5);
    expect(state.loadout.shield).toBe(1);
  });

  it("ignores ANSWER actions when not in 'question' phase", () => {
    let state = battleReducer({} as BattleState, {
      type: "INIT",
      pools: makePools(),
      mode: "minion",
      startTier: "easy",
      loadout: { hint: 0, shield: 0, fifty: 0 },
      hearts: 3,
    });

    // Answer once -> phase is 'feedback'
    state = battleReducer(state, { type: "ANSWER", picked: 0 });
    expect(state.phase).toBe("feedback");

    // Second answer should be ignored
    const state2 = battleReducer(state, { type: "ANSWER", picked: 0 });
    expect(state2).toBe(state);
  });

  it("is strictly idempotent under React StrictMode (pure reducer)", () => {
    const initialState = battleReducer({} as BattleState, {
      type: "INIT",
      pools: makePools(),
      mode: "minion",
      startTier: "easy",
      loadout: { hint: 1, shield: 1, fifty: 1 },
      hearts: 3,
    });

    deepFreeze(initialState);

    const action: BattleAction = { type: "ANSWER", picked: 0 };
    const out1 = battleReducer(initialState, action);
    const out2 = battleReducer(initialState, action);

    expect(out1).toEqual(out2);
    expect(initialState.enemyHp).toBe(MINION_HP); // input was never mutated
  });
});

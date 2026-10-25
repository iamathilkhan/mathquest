import { describe, it, expect } from "vitest";
import {
  nextAdaptive,
  initialAdaptive,
  floorForBoss,
  takeQuestion,
  type AdaptiveState,
} from "./adaptive";
import type { Pools, VerifiedQuestion } from "@/lib/schemas";

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    deepFreeze((obj as Record<string, unknown>)[key]);
  }
  return obj;
}

function makeMockQ(id: string, tier: "easy" | "medium" | "hard"): VerifiedQuestion {
  return {
    id,
    stem: `Sample question for tier ${tier} with id ${id}`,
    tier,
    expression: "1 + 1",
    options: [
      { label: "2", value: "2", why: "Correct" },
      { label: "1", value: "1", why: "Wrong" },
      { label: "3", value: "3", why: "Wrong" },
      { label: "4", value: "4", why: "Wrong" },
    ],
    correctIndex: 0,
    explanation: "1 + 1 = 2",
    hint: "Count up by one",
    check: "1 + 1 = 2",
    source: "seed",
    subSkillId: "test-skill",
  };
}

describe("adaptive logic", () => {
  it("promotes after 2 correct answers and resets counters", () => {
    let state = initialAdaptive("easy");
    state = nextAdaptive(state, true, "easy");
    expect(state).toEqual({ tier: "easy", rightRun: 1, wrongRun: 0 });

    state = nextAdaptive(state, true, "easy");
    expect(state).toEqual({ tier: "medium", rightRun: 0, wrongRun: 0 });

    state = nextAdaptive(state, true, "easy");
    state = nextAdaptive(state, true, "easy");
    expect(state).toEqual({ tier: "hard", rightRun: 0, wrongRun: 0 });
  });

  it("does not promote past hard (bounds)", () => {
    let state = initialAdaptive("hard");
    state = nextAdaptive(state, true, "easy");
    state = nextAdaptive(state, true, "easy");
    expect(state).toEqual({ tier: "hard", rightRun: 0, wrongRun: 0 });
  });

  it("single wrong answer holds tier and increments wrongRun", () => {
    let state: AdaptiveState = { tier: "medium", rightRun: 1, wrongRun: 0 };
    state = nextAdaptive(state, false, "easy");
    expect(state).toEqual({ tier: "medium", rightRun: 0, wrongRun: 1 });
  });

  it("demotes after 2 wrong in a row and resets counters", () => {
    let state = initialAdaptive("hard");
    state = nextAdaptive(state, false, "easy");
    expect(state).toEqual({ tier: "hard", rightRun: 0, wrongRun: 1 });

    state = nextAdaptive(state, false, "easy");
    expect(state).toEqual({ tier: "medium", rightRun: 0, wrongRun: 0 });

    state = nextAdaptive(state, false, "easy");
    state = nextAdaptive(state, false, "easy");
    expect(state).toEqual({ tier: "easy", rightRun: 0, wrongRun: 0 });
  });

  it("does not demote below easy (bounds)", () => {
    let state = initialAdaptive("easy");
    state = nextAdaptive(state, false, "easy");
    state = nextAdaptive(state, false, "easy");
    expect(state).toEqual({ tier: "easy", rightRun: 0, wrongRun: 0 });
  });

  it("enforces floor strictly", () => {
    let state = initialAdaptive("medium");
    // Demoting 2 times with floor="medium" must stay at "medium"
    state = nextAdaptive(state, false, "medium");
    state = nextAdaptive(state, false, "medium");
    expect(state.tier).toBe("medium");
  });

  it("computes boss floor based on hp percentage", () => {
    expect(floorForBoss(1.0)).toBe("easy");
    expect(floorForBoss(0.67)).toBe("easy");
    expect(floorForBoss(0.66)).toBe("medium");
    expect(floorForBoss(0.50)).toBe("medium");
    expect(floorForBoss(0.34)).toBe("medium");
    expect(floorForBoss(0.33)).toBe("hard");
    expect(floorForBoss(0.10)).toBe("hard");
    expect(floorForBoss(0.0)).toBe("hard");
  });

  describe("takeQuestion fallback order and immutability", () => {
    it("draws from wanted tier first", () => {
      const pools: Pools = {
        easy: [makeMockQ("e1", "easy")],
        medium: [makeMockQ("m1", "medium")],
        hard: [makeMockQ("h1", "hard")],
      };
      deepFreeze(pools);

      const res = takeQuestion(pools, "medium");
      expect(res).not.toBeNull();
      expect(res!.q.id).toBe("m1");
      expect(res!.servedTier).toBe("medium");
      expect(res!.pools.medium.length).toBe(0);
      expect(res!.pools.easy.length).toBe(1);
      expect(res!.pools.hard.length).toBe(1);
    });

    it("falls back to easier tier first on ties", () => {
      // Want medium, but medium is empty. Easy and hard are available.
      // Tie must prefer easier (easy).
      const pools: Pools = {
        easy: [makeMockQ("e1", "easy")],
        medium: [],
        hard: [makeMockQ("h1", "hard")],
      };
      deepFreeze(pools);

      const res = takeQuestion(pools, "medium");
      expect(res).not.toBeNull();
      expect(res!.servedTier).toBe("easy");
      expect(res!.q.id).toBe("e1");
    });

    it("returns null when all pools exhausted", () => {
      const pools: Pools = { easy: [], medium: [], hard: [] };
      deepFreeze(pools);
      expect(takeQuestion(pools, "hard")).toBeNull();
    });
  });
});

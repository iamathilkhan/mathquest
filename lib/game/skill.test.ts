import { describe, it, expect } from "vitest";
import {
  updateSkill,
  masteryPct,
  startTierFor,
  updateSubSkillStats,
  weakestSubSkill,
} from "./skill";
import type { SkillState, AnswerRecord, SubSkillStats } from "@/lib/schemas";

describe("cross-session adaptivity and skill tracking", () => {
  it("carries over tier and updates rolling window of 20", () => {
    const prev: SkillState = {
      tier: "easy",
      recent: Array(18).fill(true),
    };
    const history: AnswerRecord[] = [
      { id: "1", tier: "easy", correct: false, subSkillId: "s1" },
      { id: "2", tier: "easy", correct: true, subSkillId: "s1" },
      { id: "3", tier: "medium", correct: true, subSkillId: "s1" },
    ];

    const updated = updateSkill(prev, history, "medium");
    expect(updated.tier).toBe("medium");
    expect(updated.recent.length).toBe(20);
    // Last three items should be false, true, true
    expect(updated.recent.slice(-3)).toEqual([false, true, true]);
  });

  it("masteryPct enforces minimum 5 samples", () => {
    expect(masteryPct(undefined)).toBe(0);

    const fewSamples: SkillState = { tier: "easy", recent: [true, true, true, true] }; // 4 samples
    expect(masteryPct(fewSamples)).toBe(0);

    const fiveSamples: SkillState = { tier: "easy", recent: [true, true, true, true, false] }; // 4/5 = 80%
    expect(masteryPct(fiveSamples)).toBe(80);
  });

  it("startTierFor rules: stage 0 no skill -> easy; boss floor at medium", () => {
    // Stage 0, no skill -> easy
    expect(startTierFor(undefined, 0)).toBe("easy");

    // Existing skill at hard for stage 1
    const hardSkill: SkillState = { tier: "hard", recent: [] };
    expect(startTierFor(hardSkill, 1)).toBe("hard");

    // Boss stage (stageIndex 4) with easy skill -> floor at medium
    const easySkill: SkillState = { tier: "easy", recent: [] };
    expect(startTierFor(easySkill, 4)).toBe("medium");
    expect(startTierFor(undefined, 4)).toBe("medium");

    // Boss stage with hard skill stays hard
    expect(startTierFor(hardSkill, 4)).toBe("hard");
  });

  describe("SubSkillStats and weakestSubSkill", () => {
    it("updates sub-skill statistics correctly", () => {
      const stats: SubSkillStats = {};
      const history: AnswerRecord[] = [
        { id: "1", tier: "easy", correct: true, subSkillId: "s1" },
        { id: "2", tier: "easy", correct: false, subSkillId: "s1" },
        { id: "3", tier: "easy", correct: true, subSkillId: "s2" },
      ];

      const updated = updateSubSkillStats(stats, history, "realm1");
      expect(updated["realm1:s1"]).toEqual({ right: 1, total: 2 });
      expect(updated["realm1:s2"]).toEqual({ right: 1, total: 1 });
    });

    it("weakestSubSkill respects threshold and sample minimum", () => {
      const stats: SubSkillStats = {
        // Fewer than 5 samples -> ignored
        "realm1:s1": { right: 1, total: 4 }, // 25% but only 4 samples
        // 6 samples, 50% accuracy -> below threshold 70%
        "realm1:s2": { right: 3, total: 6 },
        // 6 samples, 83% accuracy -> above threshold
        "realm1:s3": { right: 5, total: 6 },
      };

      const weakest = weakestSubSkill(stats, 5, 0.7);
      expect(weakest).toBe("realm1:s2");
    });
  });
});

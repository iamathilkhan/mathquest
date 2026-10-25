import { describe, it, expect } from "vitest";
import { evaluateBadges, type BadgeContext } from "./badges";
import type { Player, StageResult } from "@/lib/schemas";
import { ENABLED_REALMS } from "@/lib/config";

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

function makeStageResult(overrides: Partial<StageResult> = {}): StageResult {
  return {
    realmId: "g5-fractions",
    stageIndex: 0,
    won: true,
    stars: 3,
    xp: 50,
    coins: 20,
    correctCount: 8,
    wrongCount: 0,
    isBoss: false,
    history: [],
    ...overrides,
  };
}

describe("badge system", () => {
  it("evaluates first_blood and untouchable correctly", () => {
    const before = makePlayer({ badges: [] });
    const after = makePlayer({ badges: [] });

    // Positive case: correct answer with 0 wrong answers on a win
    const ctx: BadgeContext = {
      before,
      after,
      stageResult: makeStageResult({ won: true, wrongCount: 0, correctCount: 8 }),
    };
    const earned = evaluateBadges(ctx);
    expect(earned).toContain("first_blood");
    expect(earned).toContain("untouchable");

    // Negative case: lost battle with wrong answers
    const ctxLost: BadgeContext = {
      before,
      after,
      stageResult: makeStageResult({ won: false, wrongCount: 3, correctCount: 0 }),
    };
    const earnedLost = evaluateBadges(ctxLost);
    expect(earnedLost).not.toContain("first_blood");
    expect(earnedLost).not.toContain("untouchable");
  });

  it("evaluates combo_master (bestCombo >= 7)", () => {
    const before = makePlayer();
    const after = makePlayer();

    // Positive case: 7 in a row in history
    const history7 = Array(7).fill({ id: "1", tier: "easy" as const, correct: true, subSkillId: "s" });
    const earned7 = evaluateBadges({
      before,
      after,
      stageResult: makeStageResult({ history: history7 }),
    });
    expect(earned7).toContain("combo_master");

    // Negative case: only 6
    const history6 = Array(6).fill({ id: "1", tier: "easy" as const, correct: true, subSkillId: "s" });
    const earned6 = evaluateBadges({
      before,
      after,
      stageResult: makeStageResult({ history: history6 }),
    });
    expect(earned6).not.toContain("combo_master");
  });

  it("evaluates hard_mode_hero (>= 5 hard correct)", () => {
    const before = makePlayer();
    const after = makePlayer();

    const historyHard5 = Array(5).fill({
      id: "1",
      tier: "hard" as const,
      correct: true,
      subSkillId: "s",
    });
    expect(
      evaluateBadges({
        before,
        after,
        stageResult: makeStageResult({ history: historyHard5 }),
      })
    ).toContain("hard_mode_hero");

    const historyHard4 = Array(4).fill({
      id: "1",
      tier: "hard" as const,
      correct: true,
      subSkillId: "s",
    });
    expect(
      evaluateBadges({
        before,
        after,
        stageResult: makeStageResult({ history: historyHard4 }),
      })
    ).not.toContain("hard_mode_hero");
  });

  it("evaluates comeback_kid and scholar", () => {
    const before = makePlayer();
    const after = makePlayer();

    expect(
      evaluateBadges({
        before,
        after,
        stageResult: makeStageResult({ won: true }),
        hadEarlierRetreat: true,
      })
    ).toContain("comeback_kid");

    expect(
      evaluateBadges({
        before,
        after,
        stageResult: makeStageResult({ won: true }),
        hadEarlierRetreat: false,
      })
    ).not.toContain("comeback_kid");

    expect(
      evaluateBadges({
        before,
        after,
        lessonCompletedBeforeBoss: true,
      })
    ).toContain("scholar");
  });

  it("evaluates realm_liberator when boss is defeated", () => {
    const before = makePlayer();
    const after = makePlayer();

    const earned = evaluateBadges({
      before,
      after,
      stageResult: makeStageResult({
        realmId: "g5-fractions",
        isBoss: true,
        won: true,
      }),
    });
    expect(earned).toContain("realm_liberator_g5-fractions");
  });

  it("evaluates on_fire_3 and on_fire_7 streaks", () => {
    const before = makePlayer();
    const afterStreak3 = makePlayer({ streak: 3 });
    const afterStreak7 = makePlayer({ streak: 7 });

    const earned3 = evaluateBadges({ before, after: afterStreak3 });
    expect(earned3).toContain("on_fire_3");
    expect(earned3).not.toContain("on_fire_7");

    const earned7 = evaluateBadges({ before, after: afterStreak7 });
    expect(earned7).toContain("on_fire_3");
    expect(earned7).toContain("on_fire_7");
  });

  it("evaluates globetrotter and perfectionist", () => {
    const before = makePlayer();

    // Globetrotter: stage 0 cleared in all 6 enabled realms
    const allRealmsStage0: Record<string, { stars: number[]; bossDefeated: boolean }> = {};
    for (const r of ENABLED_REALMS) {
      allRealmsStage0[r] = { stars: [1, -1, -1, -1, -1], bossDefeated: false };
    }
    const afterGlobetrotter = makePlayer({ realms: allRealmsStage0 });
    expect(evaluateBadges({ before, after: afterGlobetrotter })).toContain("globetrotter");

    // Perfectionist: 3 stars on all 5 stages in at least one realm
    const perfectRealm = makePlayer({
      realms: {
        "g5-fractions": { stars: [3, 3, 3, 3, 3], bossDefeated: true },
      },
    });
    expect(evaluateBadges({ before, after: perfectRealm })).toContain("perfectionist");
  });

  it("returns ONLY newly earned badge IDs and never duplicates existing ones", () => {
    // Player already has first_blood and untouchable
    const before = makePlayer({ badges: ["first_blood", "untouchable"] });
    const after = makePlayer({ badges: ["first_blood", "untouchable"] });

    const earned = evaluateBadges({
      before,
      after,
      stageResult: makeStageResult({ won: true, wrongCount: 0, correctCount: 8 }),
    });

    expect(earned).not.toContain("first_blood");
    expect(earned).not.toContain("untouchable");
  });
});

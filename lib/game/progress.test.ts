import { describe, expect, it } from "vitest";
import type { Player, StageResult } from "@/lib/schemas";
import { getRealm } from "@/data/curriculum";
import { isRealmUnlocked } from "./unlock";
import {
  applyStageResult,
  buildLoadout,
  commitUsedItems,
  createFreshPlayer,
} from "./progress";

describe("progress logic", () => {
  it("awards XP, coins, and item rewards for a winning stage", () => {
    const before: Player = createFreshPlayer("Astra");

    const result: StageResult = {
      realmId: "g5-fractions",
      stageIndex: 0,
      won: true,
      stars: 3,
      xp: 80,
      coins: 18,
      correctCount: 4,
      wrongCount: 0,
      isBoss: false,
      endTier: "hard",
      history: [
        { id: "q1", tier: "easy", correct: true, subSkillId: "g5-fractions-add-sub" },
        { id: "q2", tier: "easy", correct: true, subSkillId: "g5-fractions-add-sub" },
        { id: "q3", tier: "easy", correct: true, subSkillId: "g5-fractions-add-sub" },
        { id: "q4", tier: "easy", correct: true, subSkillId: "g5-fractions-add-sub" },
      ],
    };

    const outcome = applyStageResult(before, result, new Date("2026-01-02T10:00:00Z"));

    expect(outcome.xpGained).toBe(80 + 60);
    expect(outcome.coinsGained).toBe(23);
    expect(outcome.itemsGained).toEqual({ hint: 1, shield: 0, fifty: 0 });
    expect((outcome.player.inventory ?? { hint: 0 }).hint).toBeGreaterThanOrEqual(0);
    expect(outcome.player.realms["g5-fractions"]?.stars[0]).toBe(3);
    expect(outcome.player.realms["g5-fractions"]?.bossDefeated).toBe(false);
    expect(outcome.newBadges).toContain("first_blood");
    expect(outcome.player.level).toBe(2);
    expect(outcome.player.lifetime?.bestCombo).toBe(4);
    expect(outcome.player.lifetime?.answered).toBe(4);
    expect(outcome.player.lifetime?.correct).toBe(4);
    expect(outcome.player.skill["g5-fractions"]?.tier).toBe("hard");
    expect(outcome.player.skill["g5-fractions"]?.recent).toEqual([true, true, true, true]);
    expect(outcome.player.subSkillStats["g5-fractions:g5-fractions-add-sub"]).toEqual({ right: 4, total: 4 });
    expect(outcome.player.profile?.grade).toBe(5);
  });

  it("doubles boss completion XP and gives boss inventory rewards", () => {
    const before: Player = createFreshPlayer("Nova");
    const result: StageResult = {
      realmId: "g5-fractions",
      stageIndex: 4,
      won: true,
      stars: 3,
      xp: 90,
      coins: 30,
      correctCount: 6,
      wrongCount: 1,
      isBoss: true,
      history: [
        { id: "b1", tier: "medium", correct: true, subSkillId: "g5-fractions-multiply" },
        { id: "b2", tier: "medium", correct: true, subSkillId: "g5-fractions-divide" },
        { id: "b3", tier: "medium", correct: false, subSkillId: "g5-fractions-divide" },
        { id: "b4", tier: "hard", correct: true, subSkillId: "g5-fractions-add-sub" },
        { id: "b5", tier: "hard", correct: true, subSkillId: "g5-fractions-add-sub" },
        { id: "b6", tier: "hard", correct: true, subSkillId: "g5-fractions-add-sub" },
      ],
    };

    const outcome = applyStageResult(before, result, new Date("2026-01-02T10:00:00Z"));

    expect(outcome.xpGained).toBe(90 + 60 * 2);
    expect(outcome.itemsGained).toEqual({ hint: 1, shield: 1, fifty: 1 });
    expect(outcome.player.realms["g5-fractions"]?.bossDefeated).toBe(true);
  });

  it("keeps the best stars on replays and counts retreats", () => {
    const before: Player = createFreshPlayer("Milo");
    before.realms["g5-fractions"] = {
      stars: [0, 0, 0, 0, 0],
      bossDefeated: false,
    };

    const win: StageResult = {
      realmId: "g5-fractions",
      stageIndex: 0,
      won: true,
      stars: 2,
      xp: 20,
      coins: 10,
      correctCount: 2,
      wrongCount: 1,
      isBoss: false,
      history: [
        { id: "w1", tier: "easy", correct: true, subSkillId: "g5-fractions-add-sub" },
        { id: "w2", tier: "easy", correct: true, subSkillId: "g5-fractions-add-sub" },
        { id: "w3", tier: "easy", correct: false, subSkillId: "g5-fractions-add-sub" },
      ],
    };
    const first = applyStageResult(before, win, new Date("2026-01-02T10:00:00Z"));

    const replay: StageResult = {
      realmId: "g5-fractions",
      stageIndex: 0,
      won: true,
      stars: 1,
      xp: 20,
      coins: 10,
      correctCount: 3,
      wrongCount: 2,
      isBoss: false,
      history: [
        { id: "r1", tier: "easy", correct: true, subSkillId: "g5-fractions-add-sub" },
        { id: "r2", tier: "easy", correct: true, subSkillId: "g5-fractions-add-sub" },
        { id: "r3", tier: "easy", correct: true, subSkillId: "g5-fractions-add-sub" },
        { id: "r4", tier: "easy", correct: false, subSkillId: "g5-fractions-add-sub" },
        { id: "r5", tier: "easy", correct: false, subSkillId: "g5-fractions-add-sub" },
      ],
    };
    const second = applyStageResult(first.player, replay, new Date("2026-01-03T10:00:00Z"));

    expect(second.player.realms["g5-fractions"]?.stars[0]).toBe(2);
    expect(second.player.retreats).toBe(0);
    expect(second.player.lifetime?.stagesCleared).toBe(1);
  });

  it("counts a retreat without changing the selected grade", () => {
    const before = createFreshPlayer("Milo");
    before.grade = 6;
    before.profile = { name: "Milo", grade: 6 };
    const loss: StageResult = {
      realmId: "g6-ratios",
      stageIndex: 0,
      won: false,
      stars: 0,
      xp: 20,
      coins: 0,
      correctCount: 1,
      wrongCount: 2,
      isBoss: false,
      history: [{ id: "loss", tier: "easy", correct: false, subSkillId: "g6-ratios-concept" }],
    };
    const afterLoss = applyStageResult(before, loss, new Date("2026-01-02T10:00:00Z"));
    expect(afterLoss.player.retreats).toBe(1);
    expect(afterLoss.player.grade).toBe(6);
    expect(afterLoss.player.profile?.grade).toBe(6);
    expect(afterLoss.player.retreatedStages).toContain("g6-ratios:0");
  });

  it("awards comeback and Scholar badges from saved stage and lesson context", () => {
    const before = createFreshPlayer("Nia");
    const loss: StageResult = {
      realmId: "g5-fractions",
      stageIndex: 0,
      won: false,
      stars: 0,
      xp: 0,
      coins: 0,
      correctCount: 0,
      wrongCount: 1,
      isBoss: false,
      history: [],
    };
    const retreated = applyStageResult(before, loss, new Date("2026-01-02T10:00:00Z")).player;
    const comeback = applyStageResult(retreated, {
      ...loss,
      won: true,
      stars: 2,
      correctCount: 1,
      wrongCount: 1,
    }, new Date("2026-01-03T10:00:00Z"));
    expect(comeback.newBadges).toContain("comeback_kid");

    const scholar = createFreshPlayer("Nia");
    scholar.lessonsFinished = ["g5-fractions-add-sub"];
    const bossResult: StageResult = {
      ...loss,
      stageIndex: 4,
      isBoss: true,
      won: false,
      history: [],
    };
    const bossOutcome = applyStageResult(scholar, bossResult, new Date("2026-01-02T10:00:00Z"));
    expect(bossOutcome.newBadges).toContain("scholar");
  });

  it("updates buildLoadout and inventory use correctly", () => {
    const player: Player = createFreshPlayer("Lina");
    const inventory = player.inventory ?? { hint: 0, shield: 0, fifty: 0 };
    inventory.hint = 2;
    inventory.shield = 3;
    inventory.fifty = 4;
    player.inventory = inventory;

    expect(buildLoadout(player)).toEqual({ hint: 3, shield: 3, fifty: 4 });

    const used = { hint: 2, shield: 1, fifty: 0 };
    const after = commitUsedItems({ ...player }, used);

    expect((after.inventory ?? { hint: 0, shield: 0, fifty: 0 }).hint).toBe(1);
    expect((after.inventory ?? { hint: 0, shield: 0, fifty: 0 }).shield).toBe(2);
    expect((after.inventory ?? { hint: 0, shield: 0, fifty: 0 }).fifty).toBe(4);
  });

  it("keeps Grade 6 gated until progression allows it, unless demo mode is enabled", () => {
    const player = createFreshPlayer("Ira");
    expect(isRealmUnlocked(player, getRealm("g6-ratios"), { grade6UnlockLevel: 4 })).toBe(false);
    player.settings!.demoMode = true;
    expect(isRealmUnlocked(player, getRealm("g6-ratios"), { grade6UnlockLevel: 4 })).toBe(true);
  });
});

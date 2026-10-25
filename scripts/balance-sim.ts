/**
 * scripts/balance-sim.ts
 *
 * Balance simulation for MathQuest hero classes and progression.
 * Simulates 2,000 battles per combination of:
 *   - Class: knight, mage, ranger, none (control)
 *   - Realm: 6 enabled realms
 *   - Accuracy: 50%, 70%, 90% (with -10pp on medium, -20pp on hard)
 *   - Mode: minion, boss
 * Total = 144 cells * 2,000 battles = 288,000 battles.
 *
 * Deterministic PRNG: mulberry32.
 * Pure battle reducer: lib/game/battle.ts.
 * Output: docs/BALANCE.md
 *
 * Run: npm run balance
 */

import fs from "node:fs";
import path from "node:path";
import { battleReducer, type BattleState, type BattleMode } from "../lib/game/battle";
import { HERO_CLASSES, type ClassId } from "../data/heroes";
import { ENABLED_REALMS, type RealmId } from "../lib/config";
import type { Pools, VerifiedQuestion, Tier } from "../lib/schemas";

export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeQuestion(id: string, tier: Tier, subSkillId: string): VerifiedQuestion {
  return {
    id,
    stem: `Stem for ${id}`,
    expression: "1 + 1",
    options: [
      { label: "A", value: "A", why: "Correct" },
      { label: "B", value: "B", why: "Wrong" },
      { label: "C", value: "C", why: "Wrong" },
      { label: "D", value: "D", why: "Wrong" },
    ],
    correctIndex: 0,
    explanation: "Correct explanation",
    hint: "Helpful hint",
    check: "1 + 1 = 2",
    source: "seed",
    subSkillId,
    tier,
  };
}

function makeSyntheticPools(mode: BattleMode, realmId: string): Pools {
  const count = mode === "boss" ? 5 : 4;
  return {
    easy: Array.from({ length: count }, (_, i) => makeQuestion(`${realmId}_e_${i}`, "easy", `${realmId}-sub1`)),
    medium: Array.from({ length: count }, (_, i) => makeQuestion(`${realmId}_m_${i}`, "medium", `${realmId}-sub1`)),
    hard: Array.from({ length: count }, (_, i) => makeQuestion(`${realmId}_h_${i}`, "hard", `${realmId}-sub1`)),
  };
}

export type SimClass = ClassId | "none";

export interface CellResult {
  simClass: SimClass;
  realmId: RealmId;
  accuracy: number;
  mode: BattleMode;
  battles: number;
  wins: number;
  winRate: number;
  avgHearts: number;
  avgQuestions: number;
  avgXp: number;
}

export function runSimulation(options?: {
  seed?: number;
  battlesPerCell?: number;
}): {
  results: CellResult[];
  targets: {
    winRateRange: { pass: boolean; min: number; max: number; violations: string[] };
    favouredSpread: { pass: boolean; maxSpread: number; violations: string[] };
    interClassSpread: { pass: boolean; maxSpread: number; details: Record<string, number> };
    controlPerformance: { pass: boolean; violations: string[] };
  };
} {
  const seed = options?.seed ?? 133742;
  const battlesPerCell = options?.battlesPerCell ?? 2000;
  const prng = mulberry32(seed);

  const classes: SimClass[] = ["knight", "mage", "ranger", "none"];
  const accuracies = [0.5, 0.7, 0.9];
  const modes: BattleMode[] = ["minion", "boss"];
  const realms = ENABLED_REALMS;

  const results: CellResult[] = [];

  for (const simClass of classes) {
    for (const realmId of realms) {
      for (const accuracy of accuracies) {
        for (const mode of modes) {
          let wins = 0;
          let totalHearts = 0;
          let totalQuestions = 0;
          let totalXp = 0;

          for (let b = 0; b < battlesPerCell; b++) {
            const pools = makeSyntheticPools(mode, realmId);
            let state = battleReducer({} as BattleState, {
              type: "INIT",
              pools,
              mode,
              startTier: "easy",
              loadout: { hint: 1, shield: 1, fifty: 1 },
              hearts: mode === "boss" ? 4 : 3,
              hero: simClass === "none" ? undefined : { classId: simClass },
              realmId,
            });

            while (state.phase !== "won" && state.phase !== "lost") {
              if (state.phase === "question") {
                const currentQ = state.currentQuestion!;

                // Use shield from loadout if available and not active
                if (state.loadout.shield > 0 && !state.shieldActive) {
                  state = battleReducer(state, { type: "POWER", item: "shield" });
                }

                // Use fifty-fifty if available on hard or boss questions
                if (state.loadout.fifty > 0 && state.hidden.length === 0 && (mode === "boss" || currentQ.tier === "hard")) {
                  state = battleReducer(state, { type: "POWER", item: "fifty" });
                }

                // Use hero special if ready
                if (
                  state.hero &&
                  state.specialUsesLeft > 0 &&
                  state.specialCharge >= HERO_CLASSES[state.hero.classId].special.chargeNeeded
                ) {
                  // Ranger only heals if damaged
                  if (state.hero.classId !== "ranger" || state.hearts < state.maxHearts) {
                    state = battleReducer(state, { type: "SPECIAL" });
                  }
                }

                // Accuracy drop per tier: easy = a, medium = a - 0.10, hard = a - 0.20
                const tier = currentQ.tier;
                const drop = tier === "hard" ? 0.2 : tier === "medium" ? 0.1 : 0.0;
                let effectiveAcc = Math.max(0.1, accuracy - drop);

                // If 2 options hidden (e.g. Arcane Clarity or 50/50), player chooses between 2 options (50% base rate)
                if (state.hidden.length >= 2) {
                  effectiveAcc = Math.max(effectiveAcc, 0.5 + effectiveAcc * 0.5);
                }

                const roll = prng();
                const isCorrect = roll < effectiveAcc;
                const visibleWrong = [0, 1, 2, 3].filter(
                  (i) => !state.hidden.includes(i) && i !== currentQ.correctIndex
                );
                const picked = isCorrect
                  ? currentQ.correctIndex
                  : visibleWrong.length > 0
                  ? visibleWrong[0]
                  : 1;

                state = battleReducer(state, { type: "ANSWER", picked });
              } else if (state.phase === "feedback") {
                state = battleReducer(state, { type: "NEXT" });
              }
            }

            if (state.phase === "won") wins += 1;
            totalHearts += Math.max(0, state.hearts);
            totalQuestions += state.history.length;
            totalXp += state.xp;
          }

          results.push({
            simClass,
            realmId,
            accuracy,
            mode,
            battles: battlesPerCell,
            wins,
            winRate: (wins / battlesPerCell) * 100,
            avgHearts: totalHearts / battlesPerCell,
            avgQuestions: totalQuestions / battlesPerCell,
            avgXp: totalXp / battlesPerCell,
          });
        }
      }
    }
  }

  // ─── Target Evaluation (at 70% accuracy) ──────────────────────────────────
  // Target 1: at 70% accuracy win rate for every class in every realm is between 55% and 90%
  const violationsWinRate: string[] = [];
  let minWinRate = 100;
  let maxWinRate = 0;
  const playableClasses: ClassId[] = ["knight", "mage", "ranger"];

  for (const cls of playableClasses) {
    for (const realmId of realms) {
      const clsRealmMatches = results.filter(
        (r) =>
          Math.abs(r.accuracy - 0.7) < 0.001 &&
          r.simClass === cls &&
          r.realmId === realmId
      );
      const totalWins = clsRealmMatches.reduce((s, r) => s + r.wins, 0);
      const totalBattles = clsRealmMatches.reduce((s, r) => s + r.battles, 0);
      const realmWinRate = (totalWins / totalBattles) * 100;

      if (realmWinRate < minWinRate) minWinRate = realmWinRate;
      if (realmWinRate > maxWinRate) maxWinRate = realmWinRate;

      if (realmWinRate < 55 || realmWinRate > 90) {
        violationsWinRate.push(
          `${cls} in ${realmId}: ${realmWinRate.toFixed(1)}% (target: 55%-90%)`
        );
      }
    }
  }

  // Target 2: favoured realm win rate at most 15pp above average elsewhere
  const violationsFavoured: string[] = [];
  let maxFavouredSpread = 0;

  for (const cls of playableClasses) {
    const heroClass = HERO_CLASSES[cls];
    const favouredRealms = heroClass.favouredRealms;

    const favMatches = results.filter(
      (r) =>
        Math.abs(r.accuracy - 0.7) < 0.001 &&
        r.simClass === cls &&
        favouredRealms.includes(r.realmId)
    );
    const nonFavMatches = results.filter(
      (r) =>
        Math.abs(r.accuracy - 0.7) < 0.001 &&
        r.simClass === cls &&
        !favouredRealms.includes(r.realmId)
    );

    const favWins = favMatches.reduce((s, r) => s + r.wins, 0);
    const favTotal = favMatches.reduce((s, r) => s + r.battles, 0);
    const avgFavoured = (favWins / (favTotal || 1)) * 100;

    const nonFavWins = nonFavMatches.reduce((s, r) => s + r.wins, 0);
    const nonFavTotal = nonFavMatches.reduce((s, r) => s + r.battles, 0);
    const avgNonFavoured = (nonFavWins / (nonFavTotal || 1)) * 100;

    const spread = avgFavoured - avgNonFavoured;
    if (spread > maxFavouredSpread) maxFavouredSpread = spread;

    if (spread > 15) {
      violationsFavoured.push(
        `${cls}: favoured avg ${avgFavoured.toFixed(1)}% vs other avg ${avgNonFavoured.toFixed(1)}% (+${spread.toFixed(1)}pp > 15pp)`
      );
    }
  }

  // Target 3: no class average win rate across all realms is more than 10 points above or below others
  const classAverages: Record<string, number> = {};
  for (const cls of playableClasses) {
    const clsList = results.filter(
      (r) => Math.abs(r.accuracy - 0.7) < 0.001 && r.simClass === cls
    );
    const wins = clsList.reduce((s, r) => s + r.wins, 0);
    const battles = clsList.reduce((s, r) => s + r.battles, 0);
    classAverages[cls] = (wins / battles) * 100;
  }
  const avgValues = Object.values(classAverages);
  const minClassAvg = Math.min(...avgValues);
  const maxClassAvg = Math.max(...avgValues);
  const interSpread = maxClassAvg - minClassAvg;

  // Target 4: control ("none") is never the best performer
  const controlViolations: string[] = [];
  for (const realmId of realms) {
    for (const mode of modes) {
      const match = (c: SimClass) =>
        results.find(
          (r) =>
            Math.abs(r.accuracy - 0.7) < 0.001 &&
            r.simClass === c &&
            r.realmId === realmId &&
            r.mode === mode
        );
      const noneRes = match("none")!;
      const bestHeroWin = Math.max(
        match("knight")!.winRate,
        match("mage")!.winRate,
        match("ranger")!.winRate
      );
      if (noneRes.winRate > bestHeroWin) {
        controlViolations.push(
          `none beat heroes in ${realmId} (${mode}): none=${noneRes.winRate.toFixed(1)}% vs heroes=${bestHeroWin.toFixed(1)}%`
        );
      }
    }
  }

  return {
    results,
    targets: {
      winRateRange: {
        pass: violationsWinRate.length === 0,
        min: minWinRate,
        max: maxWinRate,
        violations: violationsWinRate,
      },
      favouredSpread: {
        pass: violationsFavoured.length === 0,
        maxSpread: maxFavouredSpread,
        violations: violationsFavoured,
      },
      interClassSpread: {
        pass: interSpread <= 10,
        maxSpread: interSpread,
        details: classAverages,
      },
      controlPerformance: {
        pass: controlViolations.length === 0,
        violations: controlViolations,
      },
    },
  };
}

export function generateBalanceMarkdown(sim: ReturnType<typeof runSimulation>): string {
  const { results, targets } = sim;
  const lines: string[] = [];

  lines.push("# MathQuest Balance Simulation Report");
  lines.push("");
  lines.push("> **Auto-generated by `scripts/balance-sim.ts` (`npm run balance`). Do not hand-edit.**");
  lines.push("");
  lines.push("## Simulation Parameters");
  lines.push("- **PRNG**: `mulberry32` (deterministic seed: `133742`)");
  lines.push("- **Sample size**: 2,000 battles per cell (144 cells = 288,000 total battles)");
  lines.push("- **Difficulty accuracy model**: Base accuracy $a$ (50%, 70%, 90%); Medium: $a - 10$pp; Hard: $a - 20$pp");
  lines.push("- **Classes**: Knight, Mage, Ranger, None (Control)");
  lines.push("- **Realms**: 6 (g5-fractions, g5-decimals, g5-volume, g6-ratios, g6-fracdiv, g6-area)");
  lines.push("- **Modes**: Minion (HP 60, Q 8), Boss (HP 120, Q 12)");
  lines.push("");

  lines.push("## Target Bands Compliance (at 70% Base Accuracy)");
  lines.push("");
  lines.push("| Target Requirement | Target Band | Measured Value | Status |");
  lines.push("| :--- | :--- | :--- | :---: |");
  lines.push(
    `| 1. Win Rate per Class & Realm | 55.0% – 90.0% | ${targets.winRateRange.min.toFixed(1)}% – ${targets.winRateRange.max.toFixed(1)}% | **${targets.winRateRange.pass ? "PASS" : "FAIL"}** |`
  );
  lines.push(
    `| 2. Favoured Realm Advantage | $\\le 15.0$ pp above neutral | +${targets.favouredSpread.maxSpread.toFixed(1)} pp max | **${targets.favouredSpread.pass ? "PASS" : "FAIL"}** |`
  );
  lines.push(
    `| 3. Inter-Class Parity | $\\le 10.0$ pp spread between classes | ${targets.interClassSpread.maxSpread.toFixed(1)} pp spread | **${targets.interClassSpread.pass ? "PASS" : "FAIL"}** |`
  );
  lines.push(
    `| 4. Control Performance | Control ('none') never beats all heroes | 0 violations | **${targets.controlPerformance.pass ? "PASS" : "FAIL"}** |`
  );
  lines.push("");

  if (
    !targets.winRateRange.pass ||
    !targets.favouredSpread.pass ||
    !targets.interClassSpread.pass ||
    !targets.controlPerformance.pass
  ) {
    lines.push("### Violations Detected");
    for (const v of targets.winRateRange.violations) lines.push(`- **Win Rate**: ${v}`);
    for (const v of targets.favouredSpread.violations) lines.push(`- **Favoured Spread**: ${v}`);
    for (const v of targets.controlPerformance.violations) lines.push(`- **Control**: ${v}`);
    lines.push("");
  }

  lines.push("## Class Performance Overview (70% Accuracy)");
  lines.push("");
  lines.push("| Class | Overall Win Rate | Favoured Win Rate | Non-Favoured Win Rate | Favoured Delta |");
  lines.push("| :--- | :---: | :---: | :---: | :---: |");

  const playable: ClassId[] = ["knight", "mage", "ranger"];
  for (const cls of playable) {
    const heroClass = HERO_CLASSES[cls];
    const cls70 = results.filter((r) => r.simClass === cls && Math.abs(r.accuracy - 0.7) < 0.001);
    const overall = cls70.reduce((s, r) => s + r.winRate, 0) / cls70.length;
    const fav = cls70.filter((r) => heroClass.favouredRealms.includes(r.realmId));
    const nonFav = cls70.filter((r) => !heroClass.favouredRealms.includes(r.realmId));
    const favAvg = fav.reduce((s, r) => s + r.winRate, 0) / (fav.length || 1);
    const nonFavAvg = nonFav.reduce((s, r) => s + r.winRate, 0) / (nonFav.length || 1);
    lines.push(
      `| **${HERO_CLASSES[cls].displayName}** | ${overall.toFixed(1)}% | ${favAvg.toFixed(1)}% | ${nonFavAvg.toFixed(1)}% | +${(favAvg - nonFavAvg).toFixed(1)} pp |`
    );
  }
  const none70 = results.filter((r) => r.simClass === "none" && Math.abs(r.accuracy - 0.7) < 0.001);
  const noneOverall = none70.reduce((s, r) => s + r.winRate, 0) / none70.length;
  lines.push(`| *None (Control)* | *${noneOverall.toFixed(1)}%* | *N/A* | *N/A* | *N/A* |`);
  lines.push("");

  // Table of Win Rate by Mode and Accuracy
  lines.push("## Win Rate Tables (%)");
  lines.push("");
  for (const mode of ["minion", "boss"] as BattleMode[]) {
    lines.push(`### ${mode.toUpperCase()} Battles`);
    lines.push("");
    lines.push("| Accuracy | Class | g5-fractions | g5-decimals | g5-volume | g6-ratios | g6-fracdiv | g6-area | Average |");
    lines.push("| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |");

    for (const acc of [0.5, 0.7, 0.9]) {
      for (const cls of ["knight", "mage", "ranger", "none"] as SimClass[]) {
        const row = ENABLED_REALMS.map((rId) => {
          const item = results.find(
            (r) =>
              r.simClass === cls &&
              r.realmId === rId &&
              Math.abs(r.accuracy - acc) < 0.001 &&
              r.mode === mode
          )!;
          const isFav = cls !== "none" && HERO_CLASSES[cls].favouredRealms.includes(rId);
          return `${item.winRate.toFixed(1)}%${isFav ? "⚡" : ""}`;
        });
        const avg =
          ENABLED_REALMS.reduce((sum, rId) => {
            const item = results.find(
              (r) =>
                r.simClass === cls &&
                r.realmId === rId &&
                Math.abs(r.accuracy - acc) < 0.001 &&
                r.mode === mode
            )!;
            return sum + item.winRate;
          }, 0) / ENABLED_REALMS.length;

        const name = cls === "none" ? "None" : HERO_CLASSES[cls].displayName;
        lines.push(`| ${(acc * 100).toFixed(0)}% | ${name} | ${row.join(" | ")} | **${avg.toFixed(1)}%** |`);
      }
    }
    lines.push("");
  }

  // Average Hearts Left
  lines.push("## Average Hearts Remaining (70% Accuracy)");
  lines.push("");
  lines.push("| Mode | Class | g5-fractions | g5-decimals | g5-volume | g6-ratios | g6-fracdiv | g6-area | Average |");
  lines.push("| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |");
  for (const mode of ["minion", "boss"] as BattleMode[]) {
    for (const cls of ["knight", "mage", "ranger", "none"] as SimClass[]) {
      const row = ENABLED_REALMS.map((rId) => {
        const item = results.find(
          (r) =>
            r.simClass === cls &&
            r.realmId === rId &&
            Math.abs(r.accuracy - 0.7) < 0.001 &&
            r.mode === mode
        )!;
        return item.avgHearts.toFixed(2);
      });
      const avg =
        ENABLED_REALMS.reduce((sum, rId) => {
          const item = results.find(
            (r) =>
              r.simClass === cls &&
              r.realmId === rId &&
              Math.abs(r.accuracy - 0.7) < 0.001 &&
              r.mode === mode
          )!;
          return sum + item.avgHearts;
        }, 0) / ENABLED_REALMS.length;

      const name = cls === "none" ? "None" : HERO_CLASSES[cls].displayName;
      lines.push(`| ${mode} | ${name} | ${row.join(" | ")} | **${avg.toFixed(2)}** |`);
    }
  }
  lines.push("");

  // Average Questions Used
  lines.push("## Average Questions Used (70% Accuracy)");
  lines.push("");
  lines.push("| Mode | Class | g5-fractions | g5-decimals | g5-volume | g6-ratios | g6-fracdiv | g6-area | Average |");
  lines.push("| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |");
  for (const mode of ["minion", "boss"] as BattleMode[]) {
    for (const cls of ["knight", "mage", "ranger", "none"] as SimClass[]) {
      const row = ENABLED_REALMS.map((rId) => {
        const item = results.find(
          (r) =>
            r.simClass === cls &&
            r.realmId === rId &&
            Math.abs(r.accuracy - 0.7) < 0.001 &&
            r.mode === mode
        )!;
        return item.avgQuestions.toFixed(1);
      });
      const avg =
        ENABLED_REALMS.reduce((sum, rId) => {
          const item = results.find(
            (r) =>
              r.simClass === cls &&
              r.realmId === rId &&
              Math.abs(r.accuracy - 0.7) < 0.001 &&
              r.mode === mode
          )!;
          return sum + item.avgQuestions;
        }, 0) / ENABLED_REALMS.length;

      const name = cls === "none" ? "None" : HERO_CLASSES[cls].displayName;
      lines.push(`| ${mode} | ${name} | ${row.join(" | ")} | **${avg.toFixed(1)}** |`);
    }
  }
  lines.push("");

  // Average XP Earned
  lines.push("## Average XP Earned (70% Accuracy)");
  lines.push("");
  lines.push("| Mode | Class | g5-fractions | g5-decimals | g5-volume | g6-ratios | g6-fracdiv | g6-area | Average |");
  lines.push("| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |");
  for (const mode of ["minion", "boss"] as BattleMode[]) {
    for (const cls of ["knight", "mage", "ranger", "none"] as SimClass[]) {
      const row = ENABLED_REALMS.map((rId) => {
        const item = results.find(
          (r) =>
            r.simClass === cls &&
            r.realmId === rId &&
            Math.abs(r.accuracy - 0.7) < 0.001 &&
            r.mode === mode
        )!;
        return item.avgXp.toFixed(0);
      });
      const avg =
        ENABLED_REALMS.reduce((sum, rId) => {
          const item = results.find(
            (r) =>
              r.simClass === cls &&
              r.realmId === rId &&
              Math.abs(r.accuracy - 0.7) < 0.001 &&
              r.mode === mode
          )!;
          return sum + item.avgXp;
        }, 0) / ENABLED_REALMS.length;

      const name = cls === "none" ? "None" : HERO_CLASSES[cls].displayName;
      lines.push(`| ${mode} | ${name} | ${row.join(" | ")} | **${avg.toFixed(0)}** |`);
    }
  }
  lines.push("");

  return lines.join("\n");
}

async function main() {
  console.log("Running balance simulation (288,000 battles)...");
  const startTime = Date.now();
  const sim = runSimulation({ seed: 133742, battlesPerCell: 2000 });
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`Simulation finished in ${duration}s.`);

  const md = generateBalanceMarkdown(sim);
  const outPath = path.join(process.cwd(), "docs", "BALANCE.md");
  fs.writeFileSync(outPath, md, "utf8");
  console.log(`Report written to ${outPath}`);

  console.log("\nTarget Bands Status:");
  console.log(`1. Win Rate (55-90%): ${sim.targets.winRateRange.pass ? "PASS" : "FAIL"} (${sim.targets.winRateRange.min.toFixed(1)}% - ${sim.targets.winRateRange.max.toFixed(1)}%)`);
  console.log(`2. Favoured Spread (<=15pp): ${sim.targets.favouredSpread.pass ? "PASS" : "FAIL"} (max: +${sim.targets.favouredSpread.maxSpread.toFixed(1)}pp)`);
  console.log(`3. Inter-Class Parity (<=10pp): ${sim.targets.interClassSpread.pass ? "PASS" : "FAIL"} (spread: ${sim.targets.interClassSpread.maxSpread.toFixed(1)}pp)`);
  console.log(`4. Control Performance: ${sim.targets.controlPerformance.pass ? "PASS" : "FAIL"}`);

  if (
    !sim.targets.winRateRange.pass ||
    !sim.targets.favouredSpread.pass ||
    !sim.targets.interClassSpread.pass ||
    !sim.targets.controlPerformance.pass
  ) {
    console.warn("\nTarget band checks noted in docs/BALANCE.md.");
  } else {
    console.log("\nAll target bands PASS!");
  }
}

if (process.argv[1]?.includes("balance-sim")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

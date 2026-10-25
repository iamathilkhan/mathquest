import type { Player, StageResult } from "@/lib/schemas";
import { coinsFor, stageBonusXp, starsFor } from "@/lib/game/xp";
import { updateSkill, updateSubSkillStats } from "@/lib/game/skill";
import { formatDay, updateStreak } from "@/lib/game/streak";
import { evaluateBadges } from "@/lib/game/badges";
import { getRealm } from "@/data/curriculum";
import { levelFromXp } from "@/lib/game/xp";

export type InventoryDelta = { hint: number; shield: number; fifty: number };

export interface ProgressOutcome {
  player: Player;
  newBadges: string[];
  leveledUp: boolean;
  xpGained: number;
  coinsGained: number;
  itemsGained: InventoryDelta;
}

export function createFreshPlayer(name: string): Player {
  return {
    profile: { name, grade: 5 },
    grade: 5,
    level: 1,
    xp: 0,
    coins: 0,
    realms: {},
    skill: {},
    subSkillStats: {},
    badges: [],
    streak: 0,
    lastDay: undefined,
    lastPlayed: undefined,
    retreatedStages: [],
    inventory: { hint: 0, shield: 1, fifty: 1 },
    lessonsFinished: [],
    retreats: 0,
    lifetime: {
      answered: 0,
      correct: 0,
      stagesCleared: 0,
      bestCombo: 0,
    },
    settings: {
      sound: true,
      music: false,
      motion: "system",
      readable: false,
      demoMode: false,
      readableFont: false,
      reducedMotion: false,
      sfxEnabled: true,
    },
  };
}

export function buildLoadout(player: Player): InventoryDelta {
  return {
    hint: 1 + (player.inventory?.hint ?? 0),
    shield: player.inventory?.shield ?? 1,
    fifty: player.inventory?.fifty ?? 1,
  };
}

export function commitUsedItems(player: Player, used: Partial<InventoryDelta>): Player {
  const hintSpent = Math.max(0, (used.hint ?? 0) - 1);
  const next = {
    ...player,
    inventory: {
      hint: Math.max(0, (player.inventory?.hint ?? 0) - hintSpent),
      shield: Math.max(0, (player.inventory?.shield ?? 0) - (used.shield ?? 0)),
      fifty: Math.max(0, (player.inventory?.fifty ?? 0) - (used.fifty ?? 0)),
    },
  };
  return next;
}

export function applyStageResult(player: Player, result: StageResult, now: Date): ProgressOutcome {
  const stageStars = result.stars ?? starsFor(result.wrongCount, result.won);
  const stageBonus = stageBonusXp(stageStars, result.isBoss);
  const xpGained = result.xp + stageBonus;
  const coinsGained = coinsFor({
    correctCount: result.correctCount,
    stars: stageStars,
    isBoss: result.isBoss,
    won: result.won,
  });
  getRealm(result.realmId as Parameters<typeof getRealm>[0]);

  const previousRealm = player.realms[result.realmId] ?? { stars: [-1, -1, -1, -1, -1], bossDefeated: false };
  const nextStars = [...previousRealm.stars];
  nextStars[result.stageIndex] = Math.max(nextStars[result.stageIndex] ?? -1, stageStars);

  let currentCombo = 0;
  let stageBestCombo = 0;
  for (const entry of result.history) {
    currentCombo = entry.correct ? currentCombo + 1 : 0;
    stageBestCombo = Math.max(stageBestCombo, currentCombo);
  }
  const latestTier = result.endTier ?? result.history.at(-1)?.tier ?? player.skill?.[result.realmId]?.tier ?? "easy";
  const clearedBefore = (player.realms[result.realmId]?.stars[result.stageIndex] ?? -1) >= 1;

  const nextPlayer: Player = {
    ...player,
    xp: (player.xp ?? 0) + xpGained,
    coins: (player.coins ?? 0) + coinsGained,
    lastDay: formatDay(now),
    lastPlayed: now.toISOString(),
    streak: updateStreak(player.lastDay, player.streak ?? 0, now),
    realms: {
      ...player.realms,
      [result.realmId]: {
        stars: nextStars,
        bossDefeated: result.isBoss ? Boolean(result.won) || previousRealm.bossDefeated : previousRealm.bossDefeated,
      },
    },
    skill: {
      ...player.skill,
      [result.realmId]: updateSkill(player.skill?.[result.realmId], result.history, latestTier),
    },
    subSkillStats: updateSubSkillStats(player.subSkillStats ?? {}, result.history, result.realmId),
    lifetime: {
      answered: (player.lifetime?.answered ?? 0) + result.history.length,
      correct: (player.lifetime?.correct ?? 0) + result.correctCount,
      stagesCleared: (player.lifetime?.stagesCleared ?? 0) + (result.won && !clearedBefore ? 1 : 0),
      bestCombo: Math.max(player.lifetime?.bestCombo ?? 0, stageBestCombo),
    },
    retreats: (player.retreats ?? 0) + (result.won ? 0 : 1),
    retreatedStages: result.won
      ? player.retreatedStages ?? []
      : [...new Set([...(player.retreatedStages ?? []), `${result.realmId}:${result.stageIndex}`])],
    inventory: player.inventory ?? { hint: 0, shield: 1, fifty: 1 },
  };

  const before = { ...player };
  const levelBefore = levelFromXp(player.xp ?? 0).level;
  const levelAfter = levelFromXp(nextPlayer.xp ?? 0).level;
  const leveledUp = levelAfter > levelBefore;
  nextPlayer.level = levelAfter;

  if (result.isBoss && result.won) {
    nextPlayer.realms[result.realmId] = {
      ...nextPlayer.realms[result.realmId],
      bossDefeated: true,
    };
  }

  const stageKey = `${result.realmId}:${result.stageIndex}`;
  const realmSubSkillIds = getRealm(result.realmId as Parameters<typeof getRealm>[0]).subSkills.map((skill) => skill.id);
  const bag = evaluateBadges({
    before,
    after: nextPlayer,
    stageResult: result,
    hadEarlierRetreat: result.won && (player.retreatedStages ?? []).includes(stageKey),
    lessonCompletedBeforeBoss:
      result.isBoss && realmSubSkillIds.some((subSkillId) => (player.lessonsFinished ?? []).includes(subSkillId)),
  });
  nextPlayer.badges = [...new Set([...(nextPlayer.badges ?? []), ...bag])];

  const itemsGained: InventoryDelta = {
    hint: result.won && stageStars === 3 ? 1 : 0,
    shield: result.won && result.isBoss ? 1 : 0,
    fifty: result.won && result.isBoss ? 1 : 0,
  };
  nextPlayer.inventory = {
    hint: (player.inventory?.hint ?? 0) + itemsGained.hint,
    shield: (player.inventory?.shield ?? 1) + itemsGained.shield,
    fifty: (player.inventory?.fifty ?? 1) + itemsGained.fifty,
  };

  return {
    player: nextPlayer,
    newBadges: bag,
    leveledUp,
    xpGained,
    coinsGained,
    itemsGained,
  };
}

"use client";

import { useEffect, useReducer, useState } from "react";

import { heartsFor } from "@/lib/config";
import { buildLoadout } from "@/lib/game/progress";
import { battleReducer, type BattleState, type BattleMode } from "@/lib/game/battle";
import { startTierFor } from "@/lib/game/skill";
import type { Player } from "@/lib/schemas";

export interface UseBattleArgs {
  player: Player;
  realmId: string;
  stageIndex: number;
  pools: Parameters<typeof battleReducer>[0]["pools"];
  mode?: BattleMode;
}

function createInitialBattleState(player: Player, realmId: string, stageIndex: number, pools: Parameters<typeof battleReducer>[0]["pools"], mode: BattleMode): BattleState {
  const startTier = startTierFor(player.skill?.[realmId], stageIndex);
  const loadout = buildLoadout(player);
  const next = battleReducer({} as BattleState, {
    type: "INIT",
    pools,
    mode,
    startTier,
    loadout,
    hearts: heartsFor(player.level),
    hero: player.hero ?? undefined,
    realmId,
  });
  return next;
}

export function useBattle({ player, realmId, stageIndex, pools, mode = stageIndex === 4 ? "boss" : "minion" }: UseBattleArgs) {
  const [startingPlayer] = useState(() => player);
  const [state, dispatch] = useReducer(battleReducer, createInitialBattleState(player, realmId, stageIndex, pools, mode), (initial) => initial);

  useEffect(() => {
    dispatch({
      type: "INIT",
      pools,
      mode,
      startTier: startTierFor(startingPlayer.skill?.[realmId], stageIndex),
      loadout: buildLoadout(startingPlayer),
      hearts: heartsFor(startingPlayer.level),
      hero: startingPlayer.hero ?? undefined,
      realmId,
    });
  }, [mode, realmId, stageIndex, pools, startingPlayer]);

  return { state, dispatch };
}

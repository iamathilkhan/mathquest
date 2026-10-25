"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect } from "react";

import { createFreshPlayer, applyStageResult, buildLoadout, commitUsedItems } from "@/lib/game/progress";
import type { Player, PlayerSettings, StageResult } from "@/lib/schemas";
import { PlayerSchema } from "@/lib/schemas";

const STORAGE_KEY = "mathquest:v1";
const DEFAULT_SETTINGS = {
  sound: true,
  music: false,
  motion: "system" as const,
  readable: false,
  demoMode: false,
  readableFont: false,
  reducedMotion: false,
  sfxEnabled: true,
};

const safeStorage = {
  getItem: (name: string) => {
    try {
      return typeof window === "undefined" ? null : window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(name, value);
    } catch {
      return;
    }
  },
  removeItem: (name: string) => {
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(name);
    } catch {
      return;
    }
  },
};

function normalizePlayer(raw: unknown): Player {
  try {
    const result = PlayerSchema.safeParse(raw);
    if (!result.success) return createFreshPlayer("");
    const player = result.data;
    const grade = player.grade ?? player.profile?.grade ?? 5;
    return {
      ...createFreshPlayer(player.profile?.name ?? ""),
      ...player,
      grade,
      profile: { name: player.profile?.name ?? "", grade },
      retreatedStages: player.retreatedStages ?? [],
      inventory: player.inventory ?? { hint: 0, shield: 1, fifty: 1 },
      lessonsFinished: player.lessonsFinished ?? [],
      retreats: player.retreats ?? 0,
      lifetime: player.lifetime ?? { answered: 0, correct: 0, stagesCleared: 0, bestCombo: 0 },
      settings: { ...DEFAULT_SETTINGS, ...player.settings },
    };
  } catch {
    return createFreshPlayer("");
  }
}

interface GameStoreState {
  player: Player;
  hydrated: boolean;
  saveExists: boolean;
  startNewGame: (name: string) => void;
  setGrade: (grade: 5 | 6) => void;
  applyResult: (result: StageResult, now?: Date) => void;
  commitItems: (used: { hint: number; shield: number; fifty: number }) => void;
  markLessonFinished: (subSkillId: string) => void;
  updateSettings: (next: Partial<PlayerSettings>) => void;
  resetAll: () => void;
  hydrate: () => void;
}

export const useGameStore = create<GameStoreState>()(
  persist(
    (set) => ({
      player: createFreshPlayer(""),
      hydrated: false,
      saveExists: false,
      hydrate: () => set({ hydrated: true }),
      startNewGame: (name: string) => {
        set({ player: createFreshPlayer(name), saveExists: true });
      },
      setGrade: (grade: 5 | 6) => {
        set((state) => ({
          player: {
            ...state.player,
            grade,
            profile: { ...(state.player.profile ?? { name: "", grade: 5 }), name: state.player.profile?.name ?? "", grade },
          },
        }));
      },
      applyResult: (result: StageResult, now = new Date()) => {
        set((state) => {
          const next = applyStageResult(state.player, result, now);
          return { player: next.player, saveExists: true };
        });
      },
      commitItems: (used) => {
        set((state) => ({ player: commitUsedItems(state.player, used) }));
      },
      markLessonFinished: (subSkillId: string) => {
        set((state) => ({
          saveExists: true,
          player: {
            ...state.player,
            lessonsFinished: [...new Set([...(state.player.lessonsFinished ?? []), subSkillId])],
          },
        }));
      },
      updateSettings: (next: Partial<PlayerSettings>) => {
        set((state) => ({
          player: {
            ...state.player,
            settings: {
              ...(state.player.settings ?? DEFAULT_SETTINGS),
              ...next,
              readable: next.readable ?? state.player.settings?.readable ?? false,
              motion: next.motion ?? state.player.settings?.motion ?? "system",
            },
          },
        }));
      },
      resetAll: () => {
        set({ player: createFreshPlayer(""), saveExists: false });
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== "object") {
          return current;
        }

        const withPlayer = "player" in persisted ? persisted.player : undefined;
        const validPlayer = withPlayer === undefined ? null : normalizePlayer(withPlayer);
        const priorSaveFlag = "saveExists" in persisted && typeof persisted.saveExists === "boolean"
          ? persisted.saveExists
          : false;
        return {
          ...current,
          player: validPlayer ?? createFreshPlayer(""),
          saveExists: Boolean(validPlayer) && (priorSaveFlag || Boolean(
            validPlayer?.lastPlayed || validPlayer?.profile?.name || validPlayer?.lifetime?.answered ||
            Object.keys(validPlayer?.realms ?? {}).length
          )),
          hydrated: true,
        };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          useGameStore.setState({ player: createFreshPlayer(""), saveExists: false, hydrated: true });
          return;
        }
        useGameStore.setState({ hydrated: true });
      },
    }
  )
);

export function SettingsEffect() {
  const settings = useGameStore((state) => state.player.settings ?? DEFAULT_SETTINGS);

  useEffect(() => {
    document.documentElement.dataset.readable = String(settings.readable ?? false);
    document.documentElement.dataset.motion = settings.motion ?? "system";
  }, [settings.readable, settings.motion]);

  return null;
}

export const gameStore = useGameStore;
export { buildLoadout, commitUsedItems };

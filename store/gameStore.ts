"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect } from "react";

import { createFreshPlayer, applyStageResult, buildLoadout, commitUsedItems } from "@/lib/game/progress";
import type { Player, PlayerSettings, StageResult } from "@/lib/schemas";
import { PlayerSchema } from "@/lib/schemas";
import type { Hero } from "@/data/heroes";

const STORAGE_KEY = "mathquest:v2";
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

    // Initialize mapNode to first unlocked realm if not set
    let mapNode = player.mapNode;
    if (!mapNode) {
      // Default to first realm of the player's grade
      const enabledRealms = ["g5-fractions", "g5-decimals", "g5-volume", "g6-ratios", "g6-fracdiv", "g6-area"];
      const gradeRealms = enabledRealms.filter((id) => id.startsWith(`g${grade}`));
      mapNode = gradeRealms[0];
    }

    return {
      ...createFreshPlayer(player.profile?.name ?? ""),
      ...player,
      grade,
      mapNode,
      hero: player.hero ?? undefined,
      profile: { name: player.profile?.name ?? "", grade },
      retreatedStages: player.retreatedStages ?? [],
      inventory: player.inventory ?? { hint: 0, shield: 1, fifty: 1 },
      lessonsFinished: player.lessonsFinished ?? [],
      retreats: player.retreats ?? 0,
      lifetime: player.lifetime ?? { answered: 0, correct: 0, stagesCleared: 0, bestCombo: 0 },
      settings: { ...DEFAULT_SETTINGS, ...player.settings },
      heartsLostAt: player.heartsLostAt ?? undefined,
      currentHearts: player.currentHearts ?? undefined,
    };
  } catch {
    return createFreshPlayer("");
  }
}

interface GameStoreState {
  player: Player;
  hydrated: boolean;
  saveExists: boolean;
  redirectedToCreateOnce: boolean;
  startNewGame: (name: string) => void;
  setGrade: (grade: 5 | 6) => void;
  applyResult: (result: StageResult, now?: Date) => void;
  commitItems: (used: { hint: number; shield: number; fifty: number }) => void;
  markLessonFinished: (subSkillId: string) => void;
  updateSettings: (next: Partial<PlayerSettings>) => void;
  setMapNode: (realmId: string) => void;
  setHero: (hero: Hero) => void;
  changeHero: (hero: Hero) => void;
  markRedirectedToCreate: () => void;
  resetAll: () => void;
  hydrate: () => void;
  /** Save that the player just lost all hearts (starts regen timer). */
  loseAllHearts: (heartsLostAt: string) => void;
  /** Restore hearts to full (called when regen completes or manually). */
  restoreHearts: () => void;
}

export const useGameStore = create<GameStoreState>()(
  persist(
    (set) => ({
      player: createFreshPlayer(""),
      hydrated: false,
      saveExists: false,
      redirectedToCreateOnce: false,
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
      setMapNode: (realmId: string) => {
        set((state) => ({
          saveExists: true,
          player: {
            ...state.player,
            mapNode: realmId,
          },
        }));
      },
      setHero: (hero: Hero) => {
        set((state) => ({
          saveExists: true,
          player: {
            ...state.player,
            hero,
          },
        }));
      },
      changeHero: (hero: Hero) => {
        set((state) => ({
          saveExists: true,
          player: {
            ...state.player,
            hero,
          },
        }));
      },
      markRedirectedToCreate: () => {
        set({ redirectedToCreateOnce: true });
      },
      resetAll: () => {
        set({ player: createFreshPlayer(""), saveExists: false });
      },
      loseAllHearts: (heartsLostAt: string) => {
        set((state) => ({
          saveExists: true,
          player: {
            ...state.player,
            heartsLostAt,
            currentHearts: 0,
          },
        }));
      },
      restoreHearts: () => {
        set((state) => ({
          saveExists: true,
          player: {
            ...state.player,
            heartsLostAt: undefined,
            currentHearts: undefined,
          },
        }));
      },
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
      migrate: (persisted: unknown, fromVersion: number): GameStoreState => {
        if (fromVersion === 0 || fromVersion === 1) {
          // v1 -> v2 migration: keep everything, add hero: undefined
          const v1State = persisted as unknown as GameStoreState;
          return {
            ...v1State,
            player: {
              ...v1State.player,
              hero: undefined,
            },
            redirectedToCreateOnce: false,
          };
        }
        return persisted as unknown as GameStoreState;
      },
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== "object") {
          return current;
        }

        const withPlayer = "player" in persisted ? persisted.player : undefined;
        const validPlayer = withPlayer === undefined ? null : normalizePlayer(withPlayer);
        const priorSaveFlag = "saveExists" in persisted && typeof persisted.saveExists === "boolean"
          ? persisted.saveExists
          : false;
        const redirectedOnce = "redirectedToCreateOnce" in persisted && persisted.redirectedToCreateOnce === true;

        return {
          ...current,
          player: validPlayer ?? createFreshPlayer(""),
          saveExists: Boolean(validPlayer) && (priorSaveFlag || Boolean(
            validPlayer?.lastPlayed || validPlayer?.profile?.name || validPlayer?.lifetime?.answered ||
            Object.keys(validPlayer?.realms ?? {}).length
          )),
          redirectedToCreateOnce: redirectedOnce,
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

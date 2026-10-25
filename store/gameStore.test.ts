import { afterEach, describe, expect, it, vi } from "vitest";
import { createFreshPlayer } from "@/lib/game/progress";
import { useGameStore } from "./gameStore";

function memoryStorage(initial: Record<string, string>) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  useGameStore.setState({ player: createFreshPlayer(""), saveExists: false, hydrated: false });
});

describe("game store hydration", () => {
  it("recovers from corrupt localStorage JSON without throwing", async () => {
    vi.stubGlobal("window", {
      localStorage: memoryStorage({ "mathquest:v1": "{broken-json" }),
    });

    await expect(useGameStore.persist.rehydrate()).resolves.toBeUndefined();
    expect(useGameStore.getState().hydrated).toBe(true);
    expect(useGameStore.getState().player).toEqual(createFreshPlayer(""));
  });

  it("resets a schema-invalid persisted player", async () => {
    vi.stubGlobal("window", {
      localStorage: memoryStorage({
        "mathquest:v1": JSON.stringify({ state: { player: { xp: -5 } }, version: 1 }),
      }),
    });

    await useGameStore.persist.rehydrate();
    expect(useGameStore.getState().player).toEqual(createFreshPlayer(""));
  });

  it("restores a valid player from Zustand's persisted state envelope", async () => {
    const savedPlayer = createFreshPlayer("Saved Hero");
    savedPlayer.xp = 245;
    savedPlayer.realms["g5-fractions"] = { stars: [3, 2, -1, -1, -1], bossDefeated: false };
    vi.stubGlobal("window", {
      localStorage: memoryStorage({
        "mathquest:v1": JSON.stringify({
          state: { player: savedPlayer, saveExists: true },
          version: 1,
        }),
      }),
    });

    await useGameStore.persist.rehydrate();

    expect(useGameStore.getState().player.profile?.name).toBe("Saved Hero");
    expect(useGameStore.getState().player.xp).toBe(245);
    expect(useGameStore.getState().player.realms["g5-fractions"]?.stars).toEqual([3, 2, -1, -1, -1]);
    expect(useGameStore.getState().saveExists).toBe(true);
  });

  it("keeps an unnamed new game available to Continue until reset", () => {
    useGameStore.getState().startNewGame("");
    expect(useGameStore.getState().saveExists).toBe(true);

    useGameStore.getState().resetAll();
    expect(useGameStore.getState().saveExists).toBe(false);
  });
});

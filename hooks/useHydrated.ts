"use client";

import { useEffect } from "react";
import { useGameStore } from "@/store/gameStore";

export function useHydrated(): boolean {
  const hydrated = useGameStore((state) => state.hydrated);

  useEffect(() => {
    void useGameStore.persist.rehydrate();
  }, []);

  return hydrated;
}

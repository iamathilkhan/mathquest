"use client";

import { useCallback } from "react";
import { useGameStore } from "@/store/gameStore";
import { playSfx, type SfxCue } from "@/lib/audio/sfx";

export function useSfx() {
  const enabled = useGameStore((state) => state.player.settings?.sound ?? state.player.settings?.sfxEnabled ?? true);
  return useCallback((cue: SfxCue) => playSfx(cue, enabled), [enabled]);
}

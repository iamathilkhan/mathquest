/**
 * lib/game/createGate.ts
 *
 * Pure function to determine if a player should be redirected to hero creation.
 * No React, no I/O.
 */

import type { Player } from "@/lib/schemas";

/**
 * Determines if a player should be redirected to /create.
 *
 * Returns true if:
 * - Player has a save (existing progress)
 * - Player has no hero selected yet
 * - Player hasn't been redirected to create already this session
 *
 * This ensures v1 saves get redirected to create ONCE per session to choose a hero.
 */
export function shouldRedirectToCreate(
  player: Player | null,
  hasSave: boolean,
  redirectedOnce: boolean
): boolean {
  if (!hasSave) return false; // New player, not a redirect
  if (redirectedOnce) return false; // Already redirected once this session
  if (!player) return false; // No valid player
  if (player.hero) return false; // Hero already chosen

  return true;
}

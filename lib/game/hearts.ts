/**
 * lib/game/hearts.ts
 *
 * Timed heart regeneration logic.
 * Rules:
 *   - When a player loses all hearts, `heartsLostAt` is saved as an ISO timestamp.
 *   - 1 heart regenerates every 5 minutes.
 *   - After 15 minutes, all 3 hearts are restored.
 */

import { heartsFor } from "@/lib/config";

export const HEART_REGEN_MS = 5 * 60 * 1000; // 5 minutes per heart
export const MAX_REGEN_HEARTS = 3; // always restore up to 3 (base hearts)

export interface HeartsStatus {
  /** How many hearts the player currently has */
  current: number;
  /** Maximum hearts for this level */
  max: number;
  /** Are hearts fully restored? */
  full: boolean;
  /** Time in ms until the next heart is regenerated (0 if full) */
  msUntilNextHeart: number;
  /** Formatted time string like "4:32" until next heart */
  nextHeartIn: string;
  /** Time in ms until fully restored (0 if full) */
  msUntilFull: number;
  /** Formatted time string like "14:32" until fully restored */
  fullIn: string;
}

/**
 * Compute the current hearts status from the player's saved state.
 */
export function computeHeartsStatus(
  heartsLostAt: string | undefined,
  currentHearts: number | undefined,
  level: number,
  now = Date.now()
): HeartsStatus {
  const max = heartsFor(level);

  if (!heartsLostAt) {
    return { current: currentHearts ?? max, max, full: true, msUntilNextHeart: 0, nextHeartIn: "", msUntilFull: 0, fullIn: "" };
  }

  const lostAt = new Date(heartsLostAt).getTime();
  const elapsed = now - lostAt;
  const heartsRegened = Math.min(MAX_REGEN_HEARTS, Math.floor(elapsed / HEART_REGEN_MS));
  const heartsNow = Math.min(max, heartsRegened);

  if (heartsNow >= MAX_REGEN_HEARTS) {
    return { current: max, max, full: true, msUntilNextHeart: 0, nextHeartIn: "", msUntilFull: 0, fullIn: "" };
  }

  const nextHeartAt = lostAt + (heartsRegened + 1) * HEART_REGEN_MS;
  const msUntilNextHeart = Math.max(0, nextHeartAt - now);
  const fullRestoreAt = lostAt + MAX_REGEN_HEARTS * HEART_REGEN_MS;
  const msUntilFull = Math.max(0, fullRestoreAt - now);

  return {
    current: heartsNow,
    max,
    full: false,
    msUntilNextHeart,
    nextHeartIn: formatMs(msUntilNextHeart),
    msUntilFull,
    fullIn: formatMs(msUntilFull),
  };
}

/** Format milliseconds as "M:SS" */
function formatMs(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

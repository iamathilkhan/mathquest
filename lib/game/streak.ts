/**
 * lib/game/streak.ts
 * Daily login streak tracking.
 *
 * We format dates manually from getFullYear/getMonth/getDate so the logic
 * is locale-independent and fully deterministic in tests with an injected clock.
 */

/** ISO-like date string: "YYYY-MM-DD" */
export type DayString = string;

/** Format a Date as "YYYY-MM-DD" (locale-independent). */
export function formatDay(date: Date): DayString {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Compute the next streak value.
 *
 * @param lastDay - last played day string (undefined if never played)
 * @param streak  - current streak count
 * @param now     - injected current Date (never use Date.now() directly)
 * @returns new streak count
 */
export function updateStreak(lastDay: string | undefined, streak: number, now: Date): number {
  const today = formatDay(now);
  if (!lastDay) return 1; // first time ever
  if (lastDay === today) return streak; // same day, no change
  if (isYesterday(lastDay, today)) return streak + 1;
  return 1; // gap — reset
}

/**
 * Determine the daily stage key for a given day.
 * Deterministic hash of stageKeys array + date string → picks one key.
 */
export function dailyStageKey(stageKeys: string[], now: Date): string | null {
  if (stageKeys.length === 0) return null;
  const day = formatDay(now);
  const hash = simpleHash(day);
  return stageKeys[hash % stageKeys.length]!;
}

// ─── Private helpers ────────────────────────────────────────────────────────────────

/** Returns true if `candidate` is the day immediately before `today`. */
function isYesterday(candidate: DayString, today: DayString): boolean {
  // Parse candidate as UTC year, month, day to avoid local timezone shifts
  const parts = candidate.split("-").map(Number);
  if (parts.length !== 3) return false;
  const year = parts[0]!;
  const month = parts[1]! - 1;
  const day = parts[2]!;

  const d = new Date(Date.UTC(year, month, day));
  d.setUTCDate(d.getUTCDate() + 1);

  const expectedYear = d.getUTCFullYear();
  const expectedMonth = String(d.getUTCMonth() + 1).padStart(2, "0");
  const expectedDay = String(d.getUTCDate()).padStart(2, "0");
  const nextDayStr = `${expectedYear}-${expectedMonth}-${expectedDay}`;

  return nextDayStr === today;
}

/** Tiny djb2-style hash, returns a non-negative integer. */
function simpleHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

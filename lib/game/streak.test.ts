import { describe, it, expect } from "vitest";
import { updateStreak, dailyStageKey } from "./streak";

describe("streak tracking", () => {
  it("initializes streak to 1 on first play", () => {
    const clock = new Date(2026, 2, 15, 10, 0, 0);
    expect(updateStreak(undefined, 0, clock)).toBe(1);
  });

  it("leaves streak unchanged if played on the same day", () => {
    const clockMorning = new Date(2026, 2, 15, 8, 0, 0);
    const clockEvening = new Date(2026, 2, 15, 20, 0, 0);
    expect(updateStreak("2026-03-15", 3, clockMorning)).toBe(3);
    expect(updateStreak("2026-03-15", 3, clockEvening)).toBe(3);
  });

  it("increments streak if played the next consecutive day", () => {
    const clock = new Date(2026, 2, 16, 8, 0, 0);
    expect(updateStreak("2026-03-15", 3, clock)).toBe(4);
  });

  it("handles month rollover correctly (e.g. Feb 28 to Mar 1)", () => {
    const clockMar1 = new Date(2026, 2, 1, 8, 0, 0);
    expect(updateStreak("2026-02-28", 5, clockMar1)).toBe(6);
  });

  it("handles year rollover correctly (e.g. Dec 31 to Jan 1)", () => {
    const clockJan1 = new Date(2027, 0, 1, 8, 0, 0);
    expect(updateStreak("2026-12-31", 10, clockJan1)).toBe(11);
  });

  it("resets streak to 1 when a day is skipped", () => {
    const clock = new Date(2026, 2, 18, 8, 0, 0);
    // Last played on 2026-03-15 (missed 16 and 17)
    expect(updateStreak("2026-03-15", 7, clock)).toBe(1);
  });

  it("determines deterministic dailyStageKey", () => {
    const stageKeys = ["g5-fractions-0", "g5-decimals-1", "g6-ratios-2"];
    const day1 = new Date("2026-10-25T12:00:00Z");
    const day2 = new Date("2026-10-26T12:00:00Z");

    const keyA = dailyStageKey(stageKeys, day1);
    const keyB = dailyStageKey(stageKeys, day1);
    const keyC = dailyStageKey(stageKeys, day2);

    expect(keyA).toBe(keyB); // Identical on the same day
    expect(stageKeys).toContain(keyA);
    expect(stageKeys).toContain(keyC);
  });
});

import { describe, expect, it } from "vitest";
import { lessonCacheKey } from "./useLesson";
import { PROMPT_VERSION } from "@/lib/promptVersion";

describe("lesson cache key", () => {
  it("includes realm, sub-skill, and prompt version to invalidate stale local lessons", () => {
    expect(lessonCacheKey("g5-fractions", "g5-fractions-add-sub")).toBe(
      `mq:lesson:g5-fractions:g5-fractions-add-sub:${PROMPT_VERSION}`
    );
  });
});

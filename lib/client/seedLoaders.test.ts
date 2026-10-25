import { describe, expect, it } from "vitest";
import { ALL_SUBSKILLS } from "@/data/curriculum";
import { seedLoaders, getSeedLoaderForSubSkill } from "./seedLoaders";

describe("seed loaders", () => {
  it("covers every curriculum sub-skill exactly once", () => {
    const expected = ALL_SUBSKILLS.map((s) => s.id).sort();
    const actual = Object.keys(seedLoaders).sort();

    expect(actual).toEqual(expected);
    expect(getSeedLoaderForSubSkill("g5-fractions-add-sub")).toBe(seedLoaders["g5-fractions-add-sub"]);
  });

  it("loads verifier-approved seed questions for every sub-skill", async () => {
    const results = await Promise.all(Object.values(seedLoaders).map((loader) => loader()));
    expect(results).toHaveLength(ALL_SUBSKILLS.length);
    for (const questions of results) {
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.every((question) => question.source === "seed")).toBe(true);
      for (const tier of ["easy", "medium", "hard"] as const) {
        expect(questions.filter((question) => question.tier === tier).length).toBeGreaterThanOrEqual(6);
      }
    }
  });
});

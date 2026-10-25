import { describe, expect, it } from "vitest";
import { ALL_SUBSKILLS } from "@/data/curriculum";
import { verifyLesson } from "@/lib/verify/lesson";
import { getLessonLoader, lessonLoaders } from "./lessonLoaders";

describe("seed lesson loaders", () => {
  it("has one explicit loader per curriculum sub-skill", () => {
    expect(Object.keys(lessonLoaders).sort()).toEqual(ALL_SUBSKILLS.map((skill) => skill.id).sort());
  });

  it("loads lessons whose worked examples pass the deterministic verifier", async () => {
    const lessons = await Promise.all(ALL_SUBSKILLS.map(async (skill) => {
      const loader = getLessonLoader(skill.id);
      expect(loader).toBeDefined();
      return loader!();
    }));
    expect(lessons.every(Boolean)).toBe(true);
    for (const lesson of lessons) expect(verifyLesson(lesson!).ok).toBe(true);
  });

  it("loads each sub-skill's own lesson file with matching title", async () => {
    for (const skill of ALL_SUBSKILLS) {
      const loader = getLessonLoader(skill.id);
      expect(loader).toBeDefined();
      const lesson = await loader!();
      expect(lesson).not.toBeNull();
      expect(lesson?.title).toBe(skill.title);
    }
  });
});

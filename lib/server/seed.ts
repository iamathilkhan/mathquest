import "server-only";

import fs from "node:fs";
import path from "node:path";

import { ENABLED_REALMS, type RealmId } from "@/lib/config";
import type { Lesson, VerifiedQuestion } from "@/lib/schemas";

const lessonsDir = "data/lessons";
const questionsDir = "data/seed-questions";

type LessonRecord = Lesson & { id?: string; realmId?: string; subSkillId?: string; source?: "seed" };
type QuestionRecord = VerifiedQuestion & { id?: string; realmId?: string; stageIndex?: number };

export interface SeedProvider {
  lessonFor(realmId: RealmId | string, subSkillId: string): Lesson | null;
  questionsFor(subSkillIds: string[], tier: "easy" | "medium" | "hard", exclude: string[]): VerifiedQuestion[];
  inventory(): { lessonCount: number; questionCount: number };
}

const lessonFiles = (() => {
  try {
    const dir = path.join(process.cwd(), lessonsDir);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((file: string) => file.endsWith(".json"));
  } catch {
    return [];
  }
})();

const questionFiles = (() => {
  try {
    const dir = path.join(process.cwd(), questionsDir);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((file: string) => file.endsWith(".json"));
  } catch {
    return [];
  }
})();

function loadLessons(): LessonRecord[] {
  const out: LessonRecord[] = [];
  for (const file of lessonFiles) {
    try {
      const abs = path.join(process.cwd(), lessonsDir, file);
      const parsed = JSON.parse(fs.readFileSync(abs, "utf8")) as LessonRecord;
      if (parsed && typeof parsed === "object") out.push(parsed);
    } catch {
      // skip invalid file
    }
  }
  return out;
}

function loadQuestions(): QuestionRecord[] {
  const out: QuestionRecord[] = [];
  for (const file of questionFiles) {
    try {
      const abs = path.join(process.cwd(), questionsDir, file);
      const parsed = JSON.parse(fs.readFileSync(abs, "utf8")) as { items?: QuestionRecord[] } | QuestionRecord[];
      const items = Array.isArray(parsed) ? parsed : parsed?.items ?? [];
      out.push(...items.filter(Boolean));
    } catch {
      // skip invalid file
    }
  }
  return out;
}

export const seedProvider: SeedProvider = {
  lessonFor(realmId: RealmId | string, subSkillId: string): Lesson | null {
    const all = loadLessons();
    const found = all.find((lesson) => lesson.realmId === realmId && lesson.subSkillId === subSkillId);
    if (!found) return null;
    return {
      title: found.title ?? "Lesson",
      hook: found.hook ?? "Learn the concept.",
      bigIdea: found.bigIdea ?? "Understand the idea.",
      vocabulary: found.vocabulary ?? [],
      workedExamples: found.workedExamples ?? [],
      commonMistakes: found.commonMistakes ?? [],
      realWorld: found.realWorld ?? "Use this skill in daily life.",
      scenes: found.scenes ?? [],
      infographic: found.infographic ?? {
        headline: "Key idea",
        keyPoints: ["Learn the idea", "Practice it", "Apply it"],
        diagram: "steps",
      },
    };
  },

  questionsFor(subSkillIds: string[], tier: "easy" | "medium" | "hard", exclude: string[]): VerifiedQuestion[] {
    const all = loadQuestions();
    const excludeSet = new Set(exclude);
    return all.filter((item) => {
      const matchesTier = item.tier === tier;
      const matchesSkill = subSkillIds.length === 0 || subSkillIds.includes(item.subSkillId ?? "");
      const notExcluded = !excludeSet.has(item.id ?? "");
      return matchesTier && matchesSkill && notExcluded;
    }) as VerifiedQuestion[];
  },

  inventory(): { lessonCount: number; questionCount: number } {
    return {
      lessonCount: loadLessons().length,
      questionCount: loadQuestions().length,
    };
  },
};

export function createSeedProvider(): SeedProvider {
  return seedProvider;
}

export function seededRealmIds(): RealmId[] {
  return ENABLED_REALMS as unknown as RealmId[];
}

export function getStaticLessonFiles(): string[] {
  return lessonFiles;
}

export function getStaticQuestionFiles(): string[] {
  return questionFiles;
}

export function fallbackLesson(realmId: string, subSkillId: string): Lesson {
  return {
    title: `Lesson: ${realmId}`,
    hook: `Practice ${subSkillId} with a clear worked example.`,
    bigIdea: "Follow the steps carefully and check the numbers in the problem.",
    vocabulary: [
      { term: "Step", definition: "Break the problem into a smaller action." },
      { term: "Check", definition: "Confirm the result matches the question." },
    ],
    workedExamples: [
      {
        problem: "What is 3/4 + 1/4?",
        expression: "3/4 + 1/4",
        answerValue: "1",
        steps: ["Add the numerators: 3 + 1 = 4", "Keep the denominator: 4", "4/4 = 1"],
      },
      {
        problem: "What is 2 × 1/3?",
        expression: "2 * (1/3)",
        answerValue: "2/3",
        steps: ["Multiply 2 by the numerator", "Keep the denominator 3", "The answer is 2/3"],
      },
    ],
    commonMistakes: [
      "Adding denominators instead of keeping them the same.",
      "Forgetting to simplify the final answer.",
    ],
    realWorld: "These steps help in real tasks like sharing food or measuring ingredients.",
    scenes: [
      { narration: "Start with the key idea.", visual: "text" },
      { narration: "Use a simple visual model.", visual: "fractionBar" },
      { narration: "Review the numbers carefully.", visual: "numberLine" },
      { narration: "Use the result in context.", visual: "steps" },
    ],
    infographic: {
      headline: "Key idea",
      keyPoints: ["Check the numbers", "Use the right operation", "Verify the final result"],
      diagram: "fractionBar",
    },
  };
}

import { describe, it, expect } from "vitest";
import { verifyLesson } from "./lesson";
import type { Lesson } from "@/lib/schemas";

function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    title: "Understanding Fractions in the Forest",
    hook: "Imagine dividing an enchanted elixir among your party members.",
    bigIdea: "Fractions represent equal parts of a whole.",
    vocabulary: [
      { term: "Numerator", definition: "The top number showing parts taken." },
      { term: "Denominator", definition: "The bottom number showing total equal parts." },
    ],
    workedExamples: [
      {
        problem: "Add 1/4 and 2/4 of the potion.",
        expression: "1/4 + 2/4",
        answerValue: "3/4",
        steps: ["Keep denominator 4", "Add numerators: 1 + 2 = 3", "Result is 3/4"],
      },
      {
        problem: "Calculate 3 times 1/5 mana crystals.",
        expression: "3 * (1/5)",
        answerValue: "3/5",
        steps: ["Multiply 3 by 1 to get 3", "Keep denominator 5", "Result is 3/5"],
      },
    ],
    commonMistakes: [
      "Adding denominators together (e.g., 1/4 + 2/4 = 3/8).",
      "Forgetting to find a common denominator.",
    ],
    realWorld: "Chefs use fractions every day when measuring recipe ingredients.",
    scenes: [
      { narration: "Welcome to Fraction Forest.", visual: "text" },
      { narration: "Notice how the fraction bar is partitioned.", visual: "fractionBar" },
      { narration: "Here is the number line representation.", visual: "numberLine" },
      { narration: "Now let's practice what you have learned.", visual: "steps" },
    ],
    infographic: {
      headline: "The Golden Rules of Fractions",
      keyPoints: [
        "Never add denominators directly.",
        "Multiply across top and bottom.",
        "Simplify using common factors.",
      ],
      diagram: "fractionBar",
    },
    ...overrides,
  };
}

describe("verifyLesson", () => {
  it("passes for a valid lesson", () => {
    const lesson = makeLesson();
    const result = verifyLesson(lesson);
    expect(result.ok).toBe(true);
  });

  it("fails if fewer than 2 worked examples provided", () => {
    const lesson = makeLesson({
      workedExamples: [
        {
          problem: "Add 1/4 and 2/4 of the potion.",
          expression: "1/4 + 2/4",
          answerValue: "3/4",
          steps: ["Step 1", "Step 2"],
        },
      ],
    });
    const result = verifyLesson(lesson);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("too_few_examples");
    }
  });

  it("fails if an example has a wrong answerValue (example_wrong_answer)", () => {
    const lesson = makeLesson({
      workedExamples: [
        {
          problem: "Add 1/4 and 2/4 of the potion.",
          expression: "1/4 + 2/4",
          answerValue: "5/4", // Wrong! 1/4 + 2/4 = 3/4
          steps: ["Step 1", "Step 2"],
        },
        {
          problem: "Calculate 3 times 1/5 mana crystals.",
          expression: "3 * (1/5)",
          answerValue: "3/5",
          steps: ["Step 1", "Step 2"],
        },
      ],
    });
    const result = verifyLesson(lesson);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("example_wrong_answer");
    }
  });

  it("fails if an example has ungrounded literal in expression (example_ungrounded)", () => {
    const lesson = makeLesson({
      workedExamples: [
        {
          problem: "Add 1/4 and 2/4 of the potion.",
          expression: "1/4 + 9", // 9 is not in the problem text and not whitelisted
          answerValue: "37/4",
          steps: ["Step 1", "Step 2"],
        },
        {
          problem: "Calculate 3 times 1/5 mana crystals.",
          expression: "3 * (1/5)",
          answerValue: "3/5",
          steps: ["Step 1", "Step 2"],
        },
      ],
    });
    const result = verifyLesson(lesson);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("example_ungrounded");
    }
  });
});

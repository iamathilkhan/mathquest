import { describe, expect, it } from "vitest";
import { alignSteps, stateAt, buildExampleScene } from "./timeline";
import { planFromExpression } from "./plan";
import { ALL_SUBSKILLS } from "@/data/curriculum";
import { getLessonLoader } from "@/lib/client/lessonLoaders";
import { evalExact } from "@/lib/verify/expression";

describe("timeline", () => {
  describe("alignSteps", () => {
    it.each([
      [4, 4, [0, 1, 2, 3]],
      [3, 5, [0, 1, 1, 2, 2]],
      [4, 5, [0, 1, 2, 2, 3]],
      [1, 3, [0, 0, 0]],
      [5, 1, [4]],
    ])("alignSteps(%i, %i) -> %j", (steps, sentences, expected) => {
      const result = alignSteps(steps, sentences);
      expect(result).toEqual(expected);
      // Endpoints check
      if (sentences > 1) {
        expect(result[0]).toBe(0);
        expect(result[result.length - 1]).toBe(steps > 0 ? steps - 1 : 0);
      }
      // Monotonicity check
      for (let i = 1; i < result.length; i++) {
        expect(result[i]).toBeGreaterThanOrEqual(result[i - 1]);
      }
    });

    it("handles edge cases: zero or negative sentences", () => {
      expect(alignSteps(4, 0)).toEqual([]);
      expect(alignSteps(0, 5)).toEqual([0, 0, 0, 0, 0]);
    });
  });

  describe("stateAt", () => {
    it("returns correct visual states for fractionAddSub plan", () => {
      const plan = planFromExpression("1/3 + 1/6")!;
      expect(plan).not.toBeNull();

      const s0 = stateAt(plan, 0);
      expect(s0.stepName).toBe("show_operands");
      expect(s0.subdivisionActive).toBe(false);
      expect(s0.combined).toBe(false);
      expect(s0.showResult).toBe(false);

      const s1 = stateAt(plan, 1);
      expect(s1.stepName).toBe("subdivide");
      expect(s1.subdivisionActive).toBe(true);
      expect(s1.combined).toBe(false);

      const s2 = stateAt(plan, 2);
      expect(s2.stepName).toBe("combine");
      expect(s2.combined).toBe(true);
      expect(s2.isCombineStep).toBe(true);

      const s3 = stateAt(plan, 3);
      expect(s3.stepName).toBe("result");
      expect(s3.showResult).toBe(true);
      expect(s3.isResultStep).toBe(true);
    });

    it("returns correct visual states for decimalGrid plan", () => {
      const plan = planFromExpression("0.3 + 0.45")!;
      expect(plan).not.toBeNull();

      const s0 = stateAt(plan, 0);
      expect(s0.stepName).toBe("show_operands");
      expect(s0.activeHundredths).toBe(30);

      const s2 = stateAt(plan, 2);
      expect(s2.stepName).toBe("combine");
      expect(s2.isCombineStep).toBe(true);
      expect(s2.combined).toBe(true);

      const s3 = stateAt(plan, 3);
      expect(s3.stepName).toBe("result");
      expect(s3.showResult).toBe(true);
      expect(s3.activeHundredths).toBe(75);
    });
  });

  describe("buildExampleScene", () => {
    it("builds an animated scene when plan exists", () => {
      const example = {
        problem: "Add 1/4 and 2/4",
        expression: "1/4 + 2/4",
        steps: ["Look at the denominators.", "Add the numerators together.", "The answer is 3/4."],
        answerValue: "3/4",
      };
      const scene = buildExampleScene(example);
      expect(scene).not.toBeNull();
      expect(scene?.visual).toBe("fractionBar");
      expect(scene?.narration).toBe("Look at the denominators. Add the numerators together. The answer is 3/4.");
    });

    it("returns null when worked example cannot be planned", () => {
      const example = {
        problem: "Multiply 3 and 4",
        expression: "3 * 4",
        steps: ["Multiply the numbers."],
        answerValue: "12",
      };
      expect(buildExampleScene(example)).toBeNull();
    });
  });

  describe("worked examples in data/lessons verifier parity", () => {
    it("every worked example yields either null or a plan matching the server verifier exact answer", async () => {
      for (const skill of ALL_SUBSKILLS) {
        const loader = getLessonLoader(skill.id);
        expect(loader).toBeDefined();
        const lesson = await loader!();
        expect(lesson).not.toBeNull();

        for (const ex of lesson!.workedExamples) {
          const plan = planFromExpression(ex.expression);
          if (plan !== null) {
            const exact = evalExact(ex.expression);
            const exactN = Number(exact.s) * Number(exact.n);
            const exactD = Number(exact.d);
            expect(plan.result.n).toBe(exactN);
            expect(plan.result.d).toBe(exactD);
          }
        }
      }
    });
  });
});

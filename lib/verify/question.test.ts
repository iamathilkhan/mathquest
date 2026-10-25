import { describe, it, expect } from "vitest";
import { verifyQuestion } from "./question";
import { evalExact, fractionToString, parseLabel } from "./expression";
import type { RawQuestion } from "@/lib/schemas";

function makeQuestion(overrides: Partial<RawQuestion> = {}): RawQuestion {
  return {
    stem: "What is 3/4 + 1/2 in simplest fractional form?",
    tier: "medium",
    expression: "3/4 + 1/2",
    options: [
      { label: "5/4", value: "5/4", why: "Correct sum" },
      { label: "1/4", value: "1/4", why: "Subtracted instead" },
      { label: "4/6", value: "4/6", why: "Added tops and bottoms" },
      { label: "1", value: "1", why: "Rounded down" },
    ],
    correctIndex: 0,
    explanation: "Find common denominator 4: 3/4 + 2/4 = 5/4.",
    hint: "Convert 1/2 to fourths.",
    subSkillId: "g5-fractions-add-sub",
    ...overrides,
  };
}

describe("verifyQuestion", () => {
  it("passes for a valid question and produces stable id", () => {
    const raw = makeQuestion();
    const result = verifyQuestion(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.q.correctIndex).toBe(0);
    expect(result.q.check).toBe("3/4 + 1/2 = 5/4");
    expect(result.q.source).toBe("live");
    expect(result.q.id).toBeDefined();

    // Idempotent / stable id
    const result2 = verifyQuestion(raw);
    if (result2.ok) {
      expect(result2.q.id).toBe(result.q.id);
    }
  });

  it("produces different id when options change", () => {
    const q1 = makeQuestion();
    const q2 = makeQuestion({
      options: [
        { label: "5/4", value: "5/4", why: "Correct" },
        { label: "2/4", value: "2/4", why: "Wrong" },
        { label: "4/6", value: "4/6", why: "Wrong" },
        { label: "1", value: "1", why: "Wrong" },
      ],
    });
    const res1 = verifyQuestion(q1);
    const res2 = verifyQuestion(q2);
    expect(res1.ok).toBe(true);
    expect(res2.ok).toBe(true);
    if (res1.ok && res2.ok) {
      expect(res1.q.id).not.toBe(res2.q.id);
    }
  });

  it("corrects wrong correctIndex claimed by the model", () => {
    // Model claims index 2 is correct, but index 0 actually matches 5/4
    const raw = makeQuestion({ correctIndex: 2 });
    const result = verifyQuestion(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.q.correctIndex).toBe(0);
    expect(result.q.correctedFromModel).toBe(true);
  });

  it("rejects when no option matches the expression (no_correct_option)", () => {
    const raw = makeQuestion({
      options: [
        { label: "2/4", value: "2/4", why: "Wrong" },
        { label: "1/4", value: "1/4", why: "Wrong" },
        { label: "4/6", value: "4/6", why: "Wrong" },
        { label: "1", value: "1", why: "Wrong" },
      ],
    });
    const result = verifyQuestion(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("no_correct_option");
    }
  });

  it("rejects when multiple options match the expression (multiple_correct)", () => {
    const raw = makeQuestion({
      options: [
        { label: "5/4", value: "5/4", why: "Match 1" },
        { label: "1.25", value: "5/4", why: "Match 2 (same fraction value)" },
        { label: "4/6", value: "4/6", why: "Wrong" },
        { label: "1", value: "1", why: "Wrong" },
      ],
    });
    // Wait: duplicate_options triggers before or after?
    // In our order:
    // 4. label_mismatch
    // 5. no_correct_option
    // 6. multiple_correct
    // 7. duplicate_options
    // Here optionValues has two identical fractions, so matchingIndices has length 2!
    const result = verifyQuestion(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("multiple_correct");
    }
  });

  it("rejects duplicate options when neither is the correct one (duplicate_options)", () => {
    const raw = makeQuestion({
      options: [
        { label: "5/4", value: "5/4", why: "Correct" },
        { label: "1/4", value: "1/4", why: "Wrong 1" },
        { label: "1/4", value: "1/4", why: "Wrong duplicate" },
        { label: "1", value: "1", why: "Wrong 3" },
      ],
    });
    const result = verifyQuestion(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("duplicate_options");
    }
  });

  it("rejects ungrounded number literal in expression (ungrounded_number)", () => {
    // Stem only mentions 3/4 and 1/2, but expression has 7.
    // One option matches 31/4 so it passes check 5 (no_correct_option) and reaches check 8.
    const raw = makeQuestion({
      stem: "Calculate 3/4 plus 1/2 of the enchanted forest.",
      expression: "3/4 + 7",
      options: [
        { label: "31/4", value: "31/4", why: "Matches expression but 7 is ungrounded" },
        { label: "1/4", value: "1/4", why: "Wrong" },
        { label: "4/6", value: "4/6", why: "Wrong" },
        { label: "1", value: "1", why: "Wrong" },
      ],
    });
    const result = verifyQuestion(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("ungrounded_number");
    }
  });

  it("allows whitelist constants (0, 1, 2, 100, 1/2) even if not in stem", () => {
    const raw: RawQuestion = {
      stem: "What is 25 percent of a total quantity?",
      tier: "easy",
      expression: "25 / 100", // 100 is whitelisted! 25 is in stem!
      options: [
        { label: "1/4", value: "1/4", why: "25/100 = 1/4" },
        { label: "1/2", value: "1/2", why: "Wrong" },
        { label: "3/4", value: "3/4", why: "Wrong" },
        { label: "1", value: "1", why: "Wrong" },
      ],
      correctIndex: 0,
      explanation: "25% means 25 out of 100, which reduces to 1/4.",
      hint: "Divide 25 by 100.",
      subSkillId: "g6-ratios-percent",
    };
    const result = verifyQuestion(raw);
    expect(result.ok).toBe(true);
  });

  it("handles label mismatch (label_mismatch)", () => {
    // label "1 1/4" equals "5/4" -> PASSES
    const rawPass = makeQuestion({
      options: [
        { label: "1 1/4", value: "5/4", why: "Mixed number matches improper fraction" },
        { label: "1/4", value: "1/4", why: "Wrong" },
        { label: "4/6", value: "4/6", why: "Wrong" },
        { label: "1", value: "1", why: "Wrong" },
      ],
    });
    const resultPass = verifyQuestion(rawPass);
    expect(resultPass.ok).toBe(true);

    // label "1 1/2" with value "5/4" -> FAILS with label_mismatch
    const rawFail = makeQuestion({
      options: [
        { label: "1 1/2", value: "5/4", why: "Does not match 5/4" },
        { label: "1/4", value: "1/4", why: "Wrong" },
        { label: "4/6", value: "4/6", why: "Wrong" },
        { label: "1", value: "1", why: "Wrong" },
      ],
    });
    const resultFail = verifyQuestion(rawFail);
    expect(resultFail.ok).toBe(false);
    if (!resultFail.ok) {
      expect(resultFail.reason).toBe("label_mismatch");
    }
  });

  it("supports percentage labels and unit suffix labels", () => {
    expect(fractionToString(parseLabel("25%")!)).toBe("1/4");
    expect(fractionToString(parseLabel("12 cm")!)).toBe("12");
    expect(fractionToString(parseLabel("3 squares")!)).toBe("3");
    expect(fractionToString(parseLabel("2 1/4")!)).toBe("9/4");
    // Thousands separators rejected
    expect(parseLabel("1,250")).toBeNull();
  });

  it("rejects non-numeric options (option_unparseable or label_unparseable)", () => {
    const raw = makeQuestion({
      options: [
        { label: "5/4", value: "not_a_number", why: "Invalid" },
        { label: "1/4", value: "1/4", why: "Wrong" },
        { label: "4/6", value: "4/6", why: "Wrong" },
        { label: "1", value: "1", why: "Wrong" },
      ],
    });
    const result = verifyQuestion(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("option_unparseable");
    }
  });

  it("rejects unsafe expression characters (** or letters)", () => {
    const rawLetter = makeQuestion({ expression: "3/4 + x" });
    expect(verifyQuestion(rawLetter).ok).toBe(false);

    const rawPower = makeQuestion({ expression: "2 ** 3" });
    expect(verifyQuestion(rawPower).ok).toBe(false);
  });

  it("rejects division by zero", () => {
    expect(() => evalExact("5 / 0")).toThrow();
  });

  describe("Exact rational arithmetic precision", () => {
    it("evaluates 0.1 + 0.2 === 3/10 exactly", () => {
      const f = evalExact("0.1 + 0.2");
      expect(fractionToString(f)).toBe("3/10");
    });

    it("evaluates 3/4 + 1/2 === 5/4 === 1.25", () => {
      const f1 = evalExact("3/4 + 1/2");
      const f2 = evalExact("1.25");
      expect(fractionToString(f1)).toBe("5/4");
      expect(fractionToString(f2)).toBe("5/4");
    });

    it("evaluates 1/3 * 3 === 1 exactly", () => {
      const f = evalExact("(1/3) * 3");
      expect(fractionToString(f)).toBe("1");
    });
  });
});

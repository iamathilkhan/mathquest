import { describe, expect, it } from "vitest";
import { planFromExpression } from "./plan";

describe("planFromExpression", () => {
  it("creates plan for fractions with like denominators", () => {
    const plan = planFromExpression("1/5 + 2/5");
    expect(plan).not.toBeNull();
    expect(plan?.kind).toBe("fractionAddSub");
    if (plan?.kind === "fractionAddSub") {
      expect(plan.commonDenominator).toBe(5);
      expect(plan.result).toEqual({ n: 3, d: 5 });
      expect(plan.steps.length).toBe(3); // show_operands, combine, result
      expect(plan.steps.map((s) => s.name)).toEqual(["show_operands", "combine", "result"]);
    }
  });

  it("creates plan for fractions with unlike denominators", () => {
    const plan = planFromExpression("1/3 + 1/6");
    expect(plan).not.toBeNull();
    expect(plan?.kind).toBe("fractionAddSub");
    if (plan?.kind === "fractionAddSub") {
      expect(plan.commonDenominator).toBe(6);
      expect(plan.equivalentOperands).toEqual([
        { n: 2, d: 6 },
        { n: 1, d: 6 },
      ]);
      expect(plan.result).toEqual({ n: 1, d: 2 });
      expect(plan.steps.length).toBe(4); // show_operands, subdivide, combine, result
      expect(plan.steps.map((s) => s.name)).toEqual(["show_operands", "subdivide", "combine", "result"]);
    }
  });

  it("handles improper fraction results", () => {
    const plan = planFromExpression("3/4 + 3/4");
    expect(plan).not.toBeNull();
    expect(plan?.kind).toBe("fractionAddSub");
    if (plan?.kind === "fractionAddSub") {
      expect(plan.result).toEqual({ n: 3, d: 2 });
    }
  });

  it("handles decimals addition (decimalGrid)", () => {
    const plan = planFromExpression("0.3 + 0.45");
    expect(plan).not.toBeNull();
    expect(plan?.kind).toBe("decimalGrid");
    if (plan?.kind === "decimalGrid") {
      expect(plan.hundredths).toEqual([30, 45]);
      expect(plan.resultHundredths).toBe(75);
      expect(plan.resultDecimal).toBe("0.75");
      expect(plan.steps.length).toBe(4);
    }
  });

  it("handles decimal subtraction", () => {
    const plan = planFromExpression("0.8 - 0.35");
    expect(plan).not.toBeNull();
    expect(plan?.kind).toBe("decimalGrid");
    if (plan?.kind === "decimalGrid") {
      expect(plan.hundredths).toEqual([80, 35]);
      expect(plan.resultHundredths).toBe(45);
      expect(plan.resultDecimal).toBe("0.45");
    }
  });

  it("handles zero operands in fractions and decimals", () => {
    const fracZero = planFromExpression("0/4 + 1/4");
    expect(fracZero).not.toBeNull();
    expect(fracZero?.result).toEqual({ n: 1, d: 4 });

    const decZero = planFromExpression("0.0 + 0.5");
    expect(decZero).not.toBeNull();
    expect(decZero?.kind).toBe("decimalGrid");
    if (decZero?.kind === "decimalGrid") {
      expect(decZero.resultDecimal).toBe("0.5");
    }
  });

  it.each([
    ["3 * 4"],
    ["2 : 3"],
    ["1/2 * 3/4"],
    ["0.125 + 0.2"], // > 2 decimal places not supported on 100-cell grid
    ["3 + 4"], // integers without fraction/decimal
    ["0.2 - 0.5"], // negative result on decimal grid
    ["invalid expression"],
    [""],
  ])("returns null for unsupported expression: %s", (expr) => {
    expect(planFromExpression(expr)).toBeNull();
  });
});

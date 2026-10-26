/**
 * lib/visual/plan.ts
 * Generates animation plans from math expressions for two kinds only:
 * - "fractionAddSub": like or unlike denominators
 * - "decimalGrid": decimal add/sub
 * Anything else returns null.
 */

import { rational, add, sub, gcd, toDecimalString, type Rational } from "./rational";

export type StepName = "show_operands" | "subdivide" | "combine" | "result";

export interface PlanStep {
  name: StepName;
  label: string;
  description: string;
}

export interface FractionAddSubPlan {
  kind: "fractionAddSub";
  op: "+" | "-";
  operands: [Rational, Rational];
  commonDenominator: number;
  equivalentOperands: [Rational, Rational];
  result: Rational;
  steps: PlanStep[];
}

export interface DecimalGridPlan {
  kind: "decimalGrid";
  op: "+" | "-";
  operands: [Rational, Rational];
  decimalOperands: [string, string];
  hundredths: [number, number];
  resultHundredths: number;
  result: Rational;
  resultDecimal: string;
  steps: PlanStep[];
}

export type Plan = FractionAddSubPlan | DecimalGridPlan;

export function planFromExpression(rawExpr: string): Plan | null {
  if (!rawExpr || typeof rawExpr !== "string") return null;
  // Normalize unicode minus to '-' and remove outer parens
  let expr = rawExpr.trim().replace(/\u2212/g, "-");
  if (expr.startsWith("(") && expr.endsWith(")")) {
    expr = expr.slice(1, -1).trim();
  }

  // Reject unsupported operations immediately: multiplication, division, powers, ratios, percentages
  if (/[*×÷^:%]/.test(expr)) return null;

  // 1. Try Decimal Grid Add/Sub
  // Matches e.g. "0.3 + 0.45", "0.8 - 0.35", ".5 + .25"
  const decRegex = /^(\d*(?:\.\d+)?)\s*([+\-])\s*(\d*(?:\.\d+)?)$/;
  const decMatch = expr.match(decRegex);
  if (decMatch && (decMatch[1].includes(".") || decMatch[3].includes("."))) {
    const op1Str = decMatch[1];
    const op = decMatch[2] as "+" | "-";
    const op2Str = decMatch[3];

    if (!op1Str || !op2Str || op1Str === "." || op2Str === ".") return null;

    // Check decimal places: decimal grid supports up to hundredths (2 decimal places)
    const p1 = op1Str.includes(".") ? op1Str.split(".")[1].length : 0;
    const p2 = op2Str.includes(".") ? op2Str.split(".")[1].length : 0;
    if (p1 > 2 || p2 > 2) return null;

    const toHundredths = (s: string) => {
      const parts = s.split(".");
      const whole = parts[0] ? parseInt(parts[0], 10) : 0;
      let dec = parts[1] || "";
      if (dec.length === 1) dec += "0";
      const fraction = dec ? parseInt(dec, 10) : 0;
      return whole * 100 + fraction;
    };

    const h1 = toHundredths(op1Str);
    const h2 = toHundredths(op2Str);

    if (h1 < 0 || h2 < 0) return null;
    const resH = op === "+" ? h1 + h2 : h1 - h2;
    // Must fit in a 100-cell grid without negative cells
    if (resH < 0 || resH > 100) return null;

    const r1 = rational(h1, 100);
    const r2 = rational(h2, 100);
    const resRational = rational(resH, 100);
    const resultDecimal = toDecimalString(resRational);

    const steps: PlanStep[] = [
      {
        name: "show_operands",
        label: `Show ${op1Str} on 100-cell grid`,
        description: `Start with ${h1} hundredths shaded on the grid.`,
      },
      {
        name: "subdivide",
        label: "Read tenths and hundredths",
        description: `Tenths: ${Math.floor(h1 / 10)}, hundredths: ${h1 % 10}. Value is ${h1}/100 ${op} ${h2}/100.`,
      },
      {
        name: "combine",
        label: op === "+" ? `Add ${op2Str} (${h2} hundredths)` : `Subtract ${op2Str} (${h2} hundredths)`,
        description: op === "+" ? `Shade ${h2} more cells on the grid.` : `Remove ${h2} shaded cells from the grid.`,
      },
      {
        name: "result",
        label: `Result: ${resultDecimal}`,
        description: `Total shaded cells: ${resH}/100 = ${resultDecimal}.`,
      },
    ];

    return {
      kind: "decimalGrid",
      op,
      operands: [r1, r2],
      decimalOperands: [op1Str, op2Str],
      hundredths: [h1, h2],
      resultHundredths: resH,
      result: resRational,
      resultDecimal,
      steps,
    };
  }

  // 2. Try Fraction Add/Sub
  // Matches e.g. "1/4 + 2/4", "1/3 + 1/6", "3/4 - 1/2"
  const fracRegex = /^(\d+)(?:\/(\d+))?\s*([+\-])\s*(\d+)(?:\/(\d+))?$/;
  const fracMatch = expr.match(fracRegex);
  if (fracMatch) {
    // At least one operand must be an explicit fraction
    if (!fracMatch[2] && !fracMatch[5]) return null;

    const n1 = parseInt(fracMatch[1], 10);
    const d1 = fracMatch[2] ? parseInt(fracMatch[2], 10) : 1;
    const op = fracMatch[3] as "+" | "-";
    const n2 = parseInt(fracMatch[4], 10);
    const d2 = fracMatch[5] ? parseInt(fracMatch[5], 10) : 1;

    if (d1 <= 0 || d2 <= 0) return null;

    const r1 = rational(n1, d1);
    const r2 = rational(n2, d2);

    // Negative fraction results are not part of elementary curriculum
    if (op === "-" && r1.n * r2.d < r2.n * r1.d) return null;

    const g = gcd(r1.d, r2.d);
    const commonD = (r1.d * r2.d) / g;
    const m1 = commonD / r1.d;
    const m2 = commonD / r2.d;
    const eq1: Rational = { n: r1.n * m1, d: commonD };
    const eq2: Rational = { n: r2.n * m2, d: commonD };

    const res = op === "+" ? add(r1, r2) : sub(r1, r2);

    const steps: PlanStep[] = [];
    steps.push({
      name: "show_operands",
      label: `Show fractions: ${r1.n}/${r1.d} ${op} ${r2.n}/${r2.d}`,
      description: `Represent ${r1.n}/${r1.d} and ${r2.n}/${r2.d} as fraction bars.`,
    });

    if (r1.d !== r2.d) {
      steps.push({
        name: "subdivide",
        label: `Subdivide to common denominator ${commonD}`,
        description: `Rewrite as ${eq1.n}/${commonD} and ${eq2.n}/${commonD}.`,
      });
    }

    steps.push({
      name: "combine",
      label: `Combine numerators: (${eq1.n} ${op} ${eq2.n}) / ${commonD}`,
      description: op === "+" ? `Slide shaded segments together.` : `Take away ${eq2.n} segments from ${eq1.n}.`,
    });

    steps.push({
      name: "result",
      label: `Result: ${res.n}/${res.d}`,
      description: `Final value is ${res.n}/${res.d}.`,
    });

    return {
      kind: "fractionAddSub",
      op,
      operands: [r1, r2],
      commonDenominator: commonD,
      equivalentOperands: [eq1, eq2],
      result: res,
      steps,
    };
  }

  return null;
}

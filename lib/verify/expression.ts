/**
 * lib/verify/expression.ts
 * SERVER-ONLY. Exact rational arithmetic using mathjs with Fraction mode.
 *
 * Why a dedicated instance? The default mathjs instance uses floats.
 * We create one with { number: "Fraction" } so 0.1 + 0.2 === 3/10 exactly.
 */
import "server-only";
import { create, all, type MathType } from "mathjs";

// ─── Dedicated mathjs instance (Fraction mode) ──────────────────────────────────

const math = create(all, { number: "Fraction" });

// ─── Types ────────────────────────────────────────────────────────────────────────

/** The mathjs Fraction type. We use it as an opaque value for comparisons. */
export type Fraction = MathType & {
  n: number | bigint;
  d: number | bigint;
  s: number | bigint;
  equals(other: Fraction): boolean;
  toString(): string;
};

// ─── Constants ──────────────────────────────────────────────────────────────────

/** Characters allowed in a verifiable math expression. */
const SAFE_EXPR_RE = /^[0-9+\-*/(). \t]+$/;

/**
 * Numbers always allowed in expressions regardless of stem content.
 * Reason: these appear in structural formulas (multiply by 2, scale by 100)
 * and whitelisting them prevents false positives in the grounding check.
 */
export const EXPR_WHITELIST: ReadonlySet<string> = new Set(["0", "1", "2", "100", "1/2"]);

// ─── Core evaluator ────────────────────────────────────────────────────────────────

/**
 * Evaluate a math expression with exact rational arithmetic.
 *
 * @throws if the expression is empty, too long, contains unsafe characters,
 *         results in a non-Fraction, or is a division by zero.
 *
 * Example: evalExact("3/4 + 1/2") → Fraction { n:5n, d:4n, s:1n }
 */
export function evalExact(expr: string): Fraction {
  const trimmed = expr.trim();
  if (!trimmed) throw new Error("Expression is empty");
  if (trimmed.length > 80) throw new Error("Expression too long");
  if (!SAFE_EXPR_RE.test(trimmed)) {
    throw new Error(`Unsafe characters in expression: ${trimmed}`);
  }

  let result: unknown;
  try {
    result = math.evaluate(trimmed);
  } catch (err) {
    throw new Error(`Math evaluation failed: ${String(err)}`);
  }

  if (!isFraction(result)) {
    throw new Error(`Expected Fraction result, got ${typeof result}: ${String(result)}`);
  }
  const d = BigInt(result.d);
  if (d === BigInt(0)) {
    throw new Error("Division by zero");
  }
  return result;
}

/**
 * Parse a canonical option value string (e.g. "5/4", "1.25", "2") to a Fraction.
 * Uses the same safe evaluator as evalExact so both paths are consistent.
 */
export function parseValue(v: string): Fraction {
  return evalExact(v);
}

/**
 * Convert a Fraction to a canonical string.
 * Integers are shown without denominator, e.g. "2" not "2/1".
 */
export function fractionToString(f: Fraction): string {
  const maybeWithToFraction = f as unknown as { toFraction?: () => string };
  if (typeof maybeWithToFraction.toFraction === "function") {
    return maybeWithToFraction.toFraction();
  }
  const d = BigInt(f.d);
  const n = BigInt(f.n);
  const s = BigInt(f.s);
  if (d === BigInt(1)) return String(s < BigInt(0) ? -n : n);
  return `${s < BigInt(0) ? "-" : ""}${n}/${d}`;
}

// ─── Label parser ───────────────────────────────────────────────────────────────────

/** Regex for mixed number: "2 1/4" */
const MIXED_RE = /^(-?\d+)\s+(\d+)\/(\d+)$/;
/** Regex for plain fraction: "3/4" */
const FRAC_RE = /^(-?\d+)\/(\d+)$/;
/** Regex for decimal or integer with optional trailing unit text: "1.25" or "12 cm" */
const DECIMAL_RE = /^(-?\d+(?:\.\d+)?)(?:\s+[a-zA-Z%°]+.*)?$/;
/** Regex for percentage: "25%" */
const PCT_RE = /^(-?\d+(?:\.\d+)?)%$/;

/**
 * Parse a human-readable option label to a Fraction.
 * Returns null if the label cannot be interpreted as a number.
 *
 * Supported formats:
 *   integer       "5"
 *   decimal       "1.25"
 *   fraction      "3/4"
 *   mixed number  "2 1/4" (positive only per grade level)
 *   percentage    "25%"
 *   unit suffix   "12 cm" or "3 squares" (strips the unit)
 *
 * NOT supported: thousands separators (1,250) — return null.
 */
export function parseLabel(label: string): Fraction | null {
  const s = label.trim();
  if (!s) return null;

  // Reject thousands separators
  if (/\d,\d/.test(s)) return null;

  // Percentage: "25%" → 25/100
  const pctMatch = PCT_RE.exec(s);
  if (pctMatch) {
    try {
      const val = evalExact(pctMatch[1]!);
      const hundred = evalExact("100");
      return math.divide(val, hundred) as Fraction;
    } catch {
      return null;
    }
  }

  // Mixed number: "2 1/4"
  const mixedMatch = MIXED_RE.exec(s);
  if (mixedMatch) {
    try {
      const whole = evalExact(mixedMatch[1]!);
      const num = evalExact(mixedMatch[2]!);
      const den = evalExact(mixedMatch[3]!);
      const frac = math.divide(num, den) as Fraction;
      // Preserve sign: if whole is negative, subtract frac
      if (whole.s < 0 || (whole.n === 0 && whole.s < 0)) {
        return math.subtract(whole, frac) as Fraction;
      }
      return math.add(whole, frac) as Fraction;
    } catch {
      return null;
    }
  }

  // Plain fraction: "3/4"
  const fracMatch = FRAC_RE.exec(s);
  if (fracMatch) {
    try {
      return evalExact(`${fracMatch[1]}/${fracMatch[2]}`);
    } catch {
      return null;
    }
  }

  // Decimal or integer with optional unit suffix: "1.25" or "12 cm"
  const decMatch = DECIMAL_RE.exec(s);
  if (decMatch) {
    try {
      return evalExact(decMatch[1]!);
    } catch {
      return null;
    }
  }

  return null;
}

// ─── Token extractor ────────────────────────────────────────────────────────────────

/**
 * Extract all numeric tokens from a text string as Fractions.
 * Handles decimals and "a/b" fractions. Mixed numbers like "2 1/4" will
 * produce tokens [2, 1/4] separately — this is acceptable per the spec.
 *
 * The grounding check in verifyQuestion compares expression literals against
 * these tokens: every literal must match at least one token or be whitelisted.
 */
export function numericTokens(text: string): Fraction[] {
  const tokens: Fraction[] = [];

  // Match fractions "a/b" first to avoid splitting them
  const fracTokenRe = /(\d+\.?\d*)\/(\d+\.?\d*)/g;
  let m: RegExpExecArray | null;

  const fracPositions = new Set<number>();
  while ((m = fracTokenRe.exec(text)) !== null) {
    try {
      const f = evalExact(`${m[1]}/${m[2]}`);
      tokens.push(f);
      for (let i = m.index; i < m.index + m[0].length; i++) fracPositions.add(i);
    } catch {
      // skip unparseable
    }
  }

  // Match standalone numbers (integers and decimals) not part of a fraction
  const numRe = /\d+\.?\d*/g;
  while ((m = numRe.exec(text)) !== null) {
    // Skip if this position was already consumed as part of a fraction token
    if (fracPositions.has(m.index)) continue;
    try {
      const f = evalExact(m[0]);
      tokens.push(f);
    } catch {
      // skip
    }
  }

  return tokens;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────────

function isFraction(v: unknown): v is Fraction {
  if (v === null || typeof v !== "object") return false;
  const f = v as Record<string, unknown>;
  const hasN = typeof f["n"] === "number" || typeof f["n"] === "bigint";
  const hasD = typeof f["d"] === "number" || typeof f["d"] === "bigint";
  const hasS = typeof f["s"] === "number" || typeof f["s"] === "bigint";
  return hasN && hasD && hasS;
}

/**
 * Equality check for two Fractions using mathjs' built-in equals.
 * More reliable than comparing n/d/s directly since mathjs normalises signs.
 */
export function fractionsEqual(a: Fraction, b: Fraction): boolean {
  try {
    return Boolean(math.equal(a, b));
  } catch {
    return false;
  }
}

/**
 * Extract numeric literal tokens from an expression string.
 * These are the numbers that must be grounded in the stem.
 */
export function exprTokens(expr: string): Fraction[] {
  // Re-use numericTokens on the expression string
  return numericTokens(expr);
}

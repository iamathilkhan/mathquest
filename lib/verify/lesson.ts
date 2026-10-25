/**
 * lib/verify/lesson.ts
 * SERVER-ONLY verifier for LLM-generated Lesson objects.
 */
import "server-only";
import type { Lesson, WorkedExample } from "@/lib/schemas";
import { evalExact, parseValue, fractionsEqual, numericTokens, fractionToString, EXPR_WHITELIST } from "./expression";

export type LessonFailureReason =
  | "too_few_examples"
  | "example_invalid"
  | "example_wrong_answer"
  | "example_ungrounded";

export type LessonVerifyResult =
  | { ok: true }
  | { ok: false; reason: LessonFailureReason; detail?: string };

/**
 * Verify a lesson's worked examples.
 *
 * Checks (per example):
 *   1. expression is syntactically valid
 *   2. expression result equals answerValue
 *   3. every literal in the expression is grounded in the problem text (or whitelisted)
 *
 * Too-few-examples is checked first as a structural gate.
 */
export function verifyLesson(raw: Lesson): LessonVerifyResult {
  if (raw.workedExamples.length < 2) {
    return { ok: false, reason: "too_few_examples" };
  }

  for (let i = 0; i < raw.workedExamples.length; i++) {
    const ex = raw.workedExamples[i]!;
    const result = verifyExample(ex, i);
    if (!result.ok) return result;
  }

  return { ok: true };
}

function verifyExample(
  ex: WorkedExample,
  index: number
): LessonVerifyResult {
  // 1. expression_invalid
  let exprResult;
  try {
    exprResult = evalExact(ex.expression);
  } catch (err) {
    return {
      ok: false,
      reason: "example_invalid",
      detail: `example ${index}: ${String(err)}`,
    };
  }

  // 2. example_wrong_answer
  let answerFraction;
  try {
    answerFraction = parseValue(ex.answerValue);
  } catch (err) {
    return {
      ok: false,
      reason: "example_wrong_answer",
      detail: `example ${index}: answerValue parse failed: ${String(err)}`,
    };
  }
  if (!fractionsEqual(exprResult, answerFraction)) {
    return {
      ok: false,
      reason: "example_wrong_answer",
      detail: `example ${index}: ${fractionToString(exprResult)} ≠ ${ex.answerValue}`,
    };
  }

  // 3. example_ungrounded — same grounding rule as questions
  const stemTokens = numericTokens(ex.problem);
  const exTokens = numericTokens(ex.expression);
  for (const token of exTokens) {
    const tokenStr = fractionToString(token);
    if (EXPR_WHITELIST.has(tokenStr)) continue;
    if (token.d === 2 && token.n === 1 && token.s === 1) continue;
    const found = stemTokens.some((st) => fractionsEqual(st, token));
    if (!found) {
      return {
        ok: false,
        reason: "example_ungrounded",
        detail: `example ${index}: literal ${tokenStr} not in problem text`,
      };
    }
  }

  return { ok: true };
}

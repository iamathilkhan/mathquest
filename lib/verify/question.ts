/**
 * lib/verify/question.ts
 * SERVER-ONLY verifier for a single RawQuestion.
 *
 * The LLM PROPOSES, deterministic code DISPOSES.
 * This module is the most important code in the repo: it ensures no
 * mathematically incorrect content reaches a student.
 */
import "server-only";
import { createHash } from "crypto";
import type { RawQuestion, VerifiedQuestion } from "@/lib/schemas";
import {
  evalExact,
  parseValue,
  parseLabel,
  fractionsEqual,
  exprTokens,
  fractionToString,
  EXPR_WHITELIST,
} from "./expression";

// ─── Reason codes ────────────────────────────────────────────────────────────────

export type VerifyFailureReason =
  | "expression_invalid"
  | "option_unparseable"
  | "label_unparseable"
  | "label_mismatch"
  | "no_correct_option"
  | "multiple_correct"
  | "duplicate_options"
  | "ungrounded_number";

export type VerifyResult =
  | { ok: true; q: VerifiedQuestion }
  | { ok: false; reason: VerifyFailureReason; detail?: string };

// ─── Stable question id ──────────────────────────────────────────────────────────────

/**
 * Derive a stable 16-hex-char id from the question content.
 * Deterministic: same stem + same sorted option values → same id.
 * Why not UUID? We need deduplication and deterministic tests.
 */
function stableId(raw: RawQuestion): string {
  const sortedValues = [...raw.options.map((o) => o.value)].sort().join("||");
  const normalizedStem = raw.stem.trim().toLowerCase();
  const payload = `${normalizedStem}||${sortedValues}`;
  return createHash("sha256").update(payload, "utf8").digest("hex").slice(0, 16);
}

// ─── Main verifier ─────────────────────────────────────────────────────────────────

/**
 * Verify a raw question from the LLM.
 *
 * Checks are run in a strict order (documented on VerifyFailureReason).
 * The FIRST failing check short-circuits and returns that reason code.
 *
 * On success: the returned VerifiedQuestion has correctIndex set by CODE
 * (the model's claim is overridden if wrong), and a stable content-hash id.
 *
 * Interview Q: Why override correctIndex instead of rejecting?
 * A: The LLM sometimes labels the right answer at the wrong index. Rejecting
 *    would waste a perfectly good question; overriding is safe because the
 *    verifier has already confirmed exactly one option matches the expression.
 */
export function verifyQuestion(raw: RawQuestion): VerifyResult {
  // 1. expression_invalid — the expression must evaluate to a Fraction
  let exprResult;
  try {
    exprResult = evalExact(raw.expression);
  } catch (err) {
    return { ok: false, reason: "expression_invalid", detail: String(err) };
  }

  // 2. option_unparseable — every option.value must evaluate
  const optionValues = [];
  for (let i = 0; i < raw.options.length; i++) {
    try {
      optionValues.push(parseValue(raw.options[i]!.value));
    } catch (err) {
      return {
        ok: false,
        reason: "option_unparseable",
        detail: `option ${i}: ${String(err)}`,
      };
    }
  }

  // 3. label_unparseable — every option.label must parseLabel to something
  const optionLabels = [];
  for (let i = 0; i < raw.options.length; i++) {
    const lf = parseLabel(raw.options[i]!.label);
    if (lf === null) {
      // Non-numeric labels (e.g. "None of the above") are allowed
      // only if the option value is also non-numeric — but here all values
      // must parse (checked above), so a non-parseable label means mismatch.
      // We record null and the mismatch check below will catch it.
      optionLabels.push(null);
    } else {
      optionLabels.push(lf);
    }
  }

  // 4. label_mismatch — parseLabel(label) must equal parseValue(value)
  for (let i = 0; i < raw.options.length; i++) {
    const lf = optionLabels[i];
    const vf = optionValues[i]!;
    if (lf === null || !fractionsEqual(lf, vf)) {
      return {
        ok: false,
        reason: "label_mismatch",
        detail: `option ${i}: label="${raw.options[i]!.label}" value="${raw.options[i]!.value}"`,
      };
    }
  }

  // 5. no_correct_option / 6. multiple_correct
  const matchingIndices = optionValues
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => fractionsEqual(f, exprResult))
    .map(({ i }) => i);

  if (matchingIndices.length === 0) {
    return { ok: false, reason: "no_correct_option" };
  }
  if (matchingIndices.length > 1) {
    return {
      ok: false,
      reason: "multiple_correct",
      detail: `indices ${matchingIndices.join(", ")}`,
    };
  }

  // 7. duplicate_options — no two values may be equal
  for (let i = 0; i < optionValues.length; i++) {
    for (let j = i + 1; j < optionValues.length; j++) {
      if (fractionsEqual(optionValues[i]!, optionValues[j]!)) {
        return {
          ok: false,
          reason: "duplicate_options",
          detail: `options ${i} and ${j} are equal`,
        };
      }
    }
  }

  // 8. ungrounded_number — every numeric literal in the expression must
  //    appear as a token in the stem, or be in the whitelist.
  const { grounded, ungroundedToken } = checkGrounding(raw.expression, raw.stem);
  if (!grounded) {
    return {
      ok: false,
      reason: "ungrounded_number",
      detail: `literal ${ungroundedToken} not found in stem`,
    };
  }

  // ─── All checks passed ──────────────────────────────────────────────────────────

  const correctIndex = matchingIndices[0]!;
  const correctedFromModel = correctIndex !== raw.correctIndex;
  const check = `${raw.expression} = ${fractionToString(exprResult)}`;
  const id = stableId(raw);

  const verified: VerifiedQuestion = {
    ...raw,
    // subSkillId is required on VerifiedQuestion; fall back to empty string if absent
    // (the API layer must set it before returning to the client)
    subSkillId: raw.subSkillId ?? "",
    id,
    check,
    correctIndex,
    correctedFromModel,
    source: "live",
  };

  return { ok: true, q: verified };
}

// ─── Grounding helper ───────────────────────────────────────────────────────────────

function checkGrounding(
  expr: string,
  stem: string
): { grounded: true; ungroundedToken?: never } | { grounded: false; ungroundedToken: string } {
  const stemTokens = numericTokensFromStem(stem);
  const tokens = exprTokens(expr);

  for (const token of tokens) {
    const tokenStr = fractionToString(token);
    // Whitelisted?
    if (EXPR_WHITELIST.has(tokenStr)) continue;
    // Also check the decimal form for whitelisted values
    if (token.d === 2 && token.n === 1 && token.s === 1) continue; // 1/2 already in whitelist

    // Found in stem?
    const found = stemTokens.some((st) => fractionsEqual(st, token));
    if (!found) {
      return { grounded: false, ungroundedToken: tokenStr };
    }
  }
  return { grounded: true };
}

import { numericTokens } from "./expression";

function numericTokensFromStem(stem: string) {
  return numericTokens(stem);
}

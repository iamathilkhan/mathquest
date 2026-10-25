/**
 * lib/game/evaluate.ts
 * Pure function that checks a student’s answer choice.
 *
 * Why pure? So it can be tested without React, Next, or the verifier.
 * The verifier runs server-side; this runs client-side from battle.ts.
 */
import type { VerifiedQuestion } from "@/lib/schemas";

export interface Verdict {
  correct: boolean;
  correctIndex: number;
  correctLabel: string;
  explanation: string;
  /** The server’s computed expression = value string */
  check: string;
  /** The "why" text for the option the student picked */
  pickedWhy: string;
}

/**
 * Evaluate the student’s answer.
 *
 * @param q - the verified question (correctIndex already set by server)
 * @param picked - the index (0-3) the student chose
 */
export function evaluate(q: VerifiedQuestion, picked: number): Verdict {
  return {
    correct: picked === q.correctIndex,
    correctIndex: q.correctIndex,
    correctLabel: q.options[q.correctIndex]!.label,
    explanation: q.explanation,
    check: q.check,
    pickedWhy: q.options[picked]?.why ?? "",
  };
}

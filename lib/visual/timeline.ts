/**
 * lib/visual/timeline.ts
 * Animation timeline functions:
 * - stateAt(plan, step): pure function mapping plan and step index to visual state.
 * - alignSteps(stepCount, sentenceCount): monotonic mapping of narration sentences to plan steps.
 * - buildExampleScene(workedExample): creates an animated Scene from a worked example.
 */

import type { Scene } from "@/lib/schemas";
import { planFromExpression, type Plan } from "./plan";

export interface VisualState {
  step: number;
  stepName: string;
  stepLabel: string;
  isCombineStep: boolean;
  isResultStep: boolean;
  // fractionAddSub specific
  subdivisionActive: boolean;
  combined: boolean;
  showResult: boolean;
  // decimalGrid specific
  activeHundredths: number;
  secondHundredths: number;
  highlightCount: number;
  op: "+" | "-";
}

export function stateAt(plan: Plan, stepIndex: number): VisualState {
  const safeStep = Math.max(0, Math.min(plan.steps.length - 1, Math.round(stepIndex)));
  const currentStep = plan.steps[safeStep];
  const stepName = currentStep.name;
  const isCombineStep = stepName === "combine";
  const isResultStep = stepName === "result";

  if (plan.kind === "fractionAddSub") {
    const hasSubdivide = plan.steps.some((s) => s.name === "subdivide");
    const subdivideIndex = plan.steps.findIndex((s) => s.name === "subdivide");
    const subdivisionActive = hasSubdivide ? safeStep >= subdivideIndex : false;
    const combined = isCombineStep || isResultStep;
    const showResult = isResultStep;

    return {
      step: safeStep,
      stepName,
      stepLabel: currentStep.label,
      isCombineStep,
      isResultStep,
      subdivisionActive,
      combined,
      showResult,
      activeHundredths: 0,
      secondHundredths: 0,
      highlightCount: 0,
      op: plan.op,
    };
  }

  // decimalGrid
  const combined = isCombineStep || isResultStep;
  const showResult = isResultStep;
  let activeHundredths = plan.hundredths[0];
  let secondHundredths = 0;
  let highlightCount = plan.hundredths[0];

  if (isCombineStep || isResultStep) {
    secondHundredths = plan.hundredths[1];
    activeHundredths = plan.resultHundredths;
    highlightCount = plan.resultHundredths;
  }

  return {
    step: safeStep,
    stepName,
    stepLabel: currentStep.label,
    isCombineStep,
    isResultStep,
    subdivisionActive: safeStep >= 1,
    combined,
    showResult,
    activeHundredths,
    secondHundredths,
    highlightCount,
    op: plan.op,
  };
}

export function alignSteps(stepCount: number, sentenceCount: number): number[] {
  if (sentenceCount <= 0) return [];
  if (stepCount <= 1) return new Array(sentenceCount).fill(0);
  if (sentenceCount === 1) return [stepCount - 1];

  const result: number[] = [];
  const maxStep = stepCount - 1;
  const maxSentence = sentenceCount - 1;

  for (let i = 0; i < sentenceCount; i++) {
    const step = Math.round((i / maxSentence) * maxStep);
    result.push(Math.max(0, Math.min(maxStep, step)));
  }

  // Enforce monotonicity
  for (let i = 1; i < result.length; i++) {
    if (result[i] < result[i - 1]) {
      result[i] = result[i - 1];
    }
  }

  // Ensure first state is 0 and final state is stepCount - 1
  result[0] = 0;
  result[result.length - 1] = maxStep;

  return result;
}

export interface ExampleLike {
  problem: string;
  steps: string[];
  answerValue: string;
  expression?: string;
}

export function buildExampleScene(workedExample: ExampleLike): Scene | null {
  const expr = workedExample.expression || workedExample.problem;
  const plan = planFromExpression(expr);
  if (!plan) return null;

  // Narration: the example's steps strings (one per sentence)
  const narration = workedExample.steps
    .map((s) => s.trim())
    .map((s) => (/[.!?]$/.test(s) ? s : `${s}.`))
    .join(" ");

  const visual = plan.kind === "fractionAddSub" ? "fractionBar" : "areaGrid";

  return {
    visual,
    narration,
    visualData: {
      expression: expr,
      answerValue: workedExample.answerValue,
      problem: workedExample.problem,
      animKind: plan.kind,
    },
  };
}

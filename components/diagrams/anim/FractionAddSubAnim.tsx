"use client";

import React from "react";
import type { FractionAddSubPlan } from "@/lib/visual/plan";
import { stateAt } from "@/lib/visual/timeline";
import { Sparkles } from "@/components/pixel/Sparkles";
import { FractionBar } from "../Diagrams";

export function FractionAddSubAnim({
  plan,
  step = 0,
  reducedMotion = false,
}: {
  plan: FractionAddSubPlan;
  step: number;
  reducedMotion?: boolean;
}) {
  if (!plan || !plan.operands || plan.kind !== "fractionAddSub") {
    return <FractionBar data={{ n: 1, d: 2 }} />;
  }

  const state = stateAt(plan, step);
  const { subdivisionActive, combined, showResult, isCombineStep, isResultStep } = state;

  const width = 320;
  const startX = 30;

  // Operand 1
  const d1 = subdivisionActive ? plan.commonDenominator : plan.operands[0].d;
  const n1 = subdivisionActive ? plan.equivalentOperands[0].n : plan.operands[0].n;
  const seg1Width = width / d1;

  // Operand 2
  const d2 = subdivisionActive ? plan.commonDenominator : plan.operands[1].d;
  const n2 = subdivisionActive ? plan.equivalentOperands[1].n : plan.operands[1].n;
  const seg2Width = width / d2;

  // Combined result bar
  const resD = plan.commonDenominator;
  const resN = plan.result.n;
  const resSegWidth = width / resD;

  const showSparkles = (isCombineStep || isResultStep) && !reducedMotion;

  return (
    <div className="diagram-stack anim-diagram-wrap">
      <svg
        viewBox="0 0 380 230"
        role="img"
        aria-label={`Animation step ${step + 1}: ${state.stepLabel}`}
        shapeRendering="crispEdges"
        className="anim-svg"
      >
        {/* Step label / status indicator */}
        <text x="190" y="16" textAnchor="middle" fill="var(--ink-brown, #3a2a14)" fontSize="13" fontWeight="bold">
          {state.stepLabel}
        </text>

        {/* Fraction 1 label & bar */}
        <text x={startX} y="33" fill="var(--ink-brown, #3a2a14)" fontSize="12" fontWeight="600">
          Fraction A: {plan.operands[0].n}/{plan.operands[0].d}
          {subdivisionActive && plan.operands[0].d !== plan.commonDenominator
            ? ` → ${plan.equivalentOperands[0].n}/${plan.commonDenominator}`
            : ""}
        </text>
        <g transform="translate(0, 38)">
          {Array.from({ length: d1 }, (_, i) => (
            <rect
              key={`f1-${d1}-${i}`}
              x={startX + i * seg1Width}
              y="0"
              width={seg1Width}
              height="26"
              fill={i < n1 ? "var(--accent, #3fae5a)" : "var(--parchment-dark, #c9b27c)"}
              stroke="var(--ink-brown, #3a2a14)"
              strokeWidth="2"
              style={{ transition: "all 0.4s ease" }}
            />
          ))}
        </g>

        {/* Operation symbol */}
        <text x="190" y="80" textAnchor="middle" fill="var(--ink-brown, #3a2a14)" fontSize="18" fontWeight="bold">
          {plan.op === "+" ? "+" : "−"}
        </text>

        {/* Fraction 2 label & bar */}
        <text x={startX} y="95" fill="var(--ink-brown, #3a2a14)" fontSize="12" fontWeight="600">
          Fraction B: {plan.operands[1].n}/{plan.operands[1].d}
          {subdivisionActive && plan.operands[1].d !== plan.commonDenominator
            ? ` → ${plan.equivalentOperands[1].n}/${plan.commonDenominator}`
            : ""}
        </text>
        <g transform="translate(0, 100)">
          {Array.from({ length: d2 }, (_, i) => (
            <rect
              key={`f2-${d2}-${i}`}
              x={startX + i * seg2Width}
              y="0"
              width={seg2Width}
              height="26"
              fill={i < n2 ? "var(--hp-blue, #3a7bd5)" : "var(--parchment-dark, #c9b27c)"}
              stroke="var(--ink-brown, #3a2a14)"
              strokeWidth="2"
              style={{ transition: "all 0.4s ease" }}
            />
          ))}
        </g>

        {/* Combined bar */}
        {combined && (
          <g transform="translate(0, 142)">
            <text x={startX} y="-4" fill="var(--ink-brown, #3a2a14)" fontSize="12" fontWeight="bold">
              Combined:
            </text>
            {Array.from({ length: resD }, (_, i) => {
              let fill = "var(--parchment-dark, #c9b27c)";
              if (plan.op === "+") {
                if (i < plan.equivalentOperands[0].n) {
                  fill = "var(--accent, #3fae5a)";
                } else if (i < plan.equivalentOperands[0].n + plan.equivalentOperands[1].n) {
                  fill = "var(--hp-blue, #3a7bd5)";
                }
              } else {
                if (i < resN) {
                  fill = "var(--accent, #3fae5a)";
                }
              }
              return (
                <rect
                  key={`res-${resD}-${i}`}
                  x={startX + i * resSegWidth}
                  y="2"
                  width={resSegWidth}
                  height="30"
                  fill={fill}
                  stroke="var(--ink-brown, #3a2a14)"
                  strokeWidth="2"
                  style={{ transition: "all 0.4s ease" }}
                />
              );
            })}
          </g>
        )}

        {/* Result readout with pop-scale */}
        {showResult && (
          <g transform="translate(190, 205)">
            <text
              x="0"
              y="0"
              textAnchor="middle"
              fill="var(--gold-dark, #8d774b)"
              fontSize="20"
              fontWeight="bold"
              className={!reducedMotion ? "pop-scale" : ""}
            >
              = {plan.result.n}/{plan.result.d}
            </text>
          </g>
        )}

        {/* Particle sparkles burst on combine & result */}
        <Sparkles active={showSparkles} x={190} y={155} reducedMotion={reducedMotion} />
      </svg>
    </div>
  );
}

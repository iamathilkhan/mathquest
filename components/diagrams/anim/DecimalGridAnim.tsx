"use client";

import React from "react";
import type { DecimalGridPlan } from "@/lib/visual/plan";
import { stateAt } from "@/lib/visual/timeline";
import { Sparkles } from "@/components/pixel/Sparkles";
import { AreaGrid } from "../Diagrams";

export function DecimalGridAnim({
  plan,
  step = 0,
  reducedMotion = false,
}: {
  plan: DecimalGridPlan;
  step: number;
  reducedMotion?: boolean;
}) {
  if (!plan || !plan.hundredths || plan.kind !== "decimalGrid") {
    return <AreaGrid data={{ rows: 10, cols: 10, shaded: 50 }} />;
  }

  const state = stateAt(plan, step);
  const { combined, showResult, isCombineStep, isResultStep } = state;

  const h1 = plan.hundredths[0];
  const h2 = plan.hundredths[1];
  const resH = plan.resultHundredths;

  const showSparkles = (isCombineStep || isResultStep) && !reducedMotion;

  // 100 cells (10x10)
  const cellSize = 14;
  const gap = 2;
  const gridStartX = 16;
  const gridStartY = 24;

  return (
    <div className="diagram-stack anim-diagram-wrap">
      <svg
        viewBox="0 0 380 210"
        role="img"
        aria-label={`Decimal grid animation step ${step + 1}: ${state.stepLabel}`}
        shapeRendering="crispEdges"
        className="anim-svg"
      >
        {/* Step label / status indicator */}
        <text x="190" y="16" textAnchor="middle" fill="var(--ink-brown, #3a2a14)" fontSize="13" fontWeight="bold">
          {state.stepLabel}
        </text>

        {/* 10x10 Grid */}
        <g transform={`translate(${gridStartX}, ${gridStartY})`}>
          {Array.from({ length: 100 }, (_, i) => {
            const row = Math.floor(i / 10);
            const col = i % 10;
            const x = col * (cellSize + gap);
            const y = row * (cellSize + gap);

            let fill = "var(--parchment-dark, #c9b27c)";
            const stroke = "var(--ink-brown, #3a2a14)";
            let opacity = 1;

            if (plan.op === "+") {
              if (i < h1) {
                fill = "var(--accent, #3fae5a)";
              } else if (combined && i < h1 + h2) {
                fill = "var(--hp-blue, #3a7bd5)";
              }
            } else {
              // Subtraction
              if (combined) {
                if (i < resH) {
                  fill = "var(--accent, #3fae5a)";
                } else if (i < h1) {
                  fill = "#d03a3a";
                  opacity = 0.45;
                }
              } else {
                if (i < h1) {
                  fill = "var(--accent, #3fae5a)";
                }
              }
            }

            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                fill={fill}
                stroke={stroke}
                strokeWidth="1"
                opacity={opacity}
                style={{ transition: "fill 0.35s ease, opacity 0.35s ease" }}
              />
            );
          })}
        </g>

        {/* Readout panel on right side */}
        <g transform="translate(196, 32)">
          <text x="0" y="0" fill="var(--ink-brown, #3a2a14)" fontSize="13" fontWeight="bold">
            100-Square Grid
          </text>

          <text x="0" y="24" fill="var(--ink-brown, #3a2a14)" fontSize="12">
            Operand 1: {plan.decimalOperands[0]}
          </text>
          <text x="0" y="40" fill="var(--accent, #3fae5a)" fontSize="11" fontWeight="600">
            = {h1} hundredths ({Math.floor(h1 / 10)} tenths, {h1 % 10} hundredths)
          </text>

          <text x="0" y="66" fill="var(--ink-brown, #3a2a14)" fontSize="12">
            {plan.op === "+" ? "+ Add" : "− Subtract"}: {plan.decimalOperands[1]}
          </text>
          <text x="0" y="82" fill="var(--hp-blue, #3a7bd5)" fontSize="11" fontWeight="600">
            = {h2} hundredths
          </text>

          {/* Tenths & hundredths readout */}
          <rect x="0" y="96" width="168" height="34" fill="var(--parchment, #e9d9ae)" stroke="var(--ink-brown, #3a2a14)" strokeWidth="1" />
          <text x="8" y="112" fill="var(--ink-brown, #3a2a14)" fontSize="11">
            Current shaded: {state.highlightCount} / 100
          </text>
          <text x="8" y="125" fill="var(--ink-brown, #3a2a14)" fontSize="10">
            Tenths: {Math.floor(state.highlightCount / 10)} | Hundredths: {state.highlightCount % 10}
          </text>

          {/* Result readout with pop-scale */}
          {showResult && (
            <g transform="translate(84, 158)">
              <text
                x="0"
                y="0"
                textAnchor="middle"
                fill="var(--gold-dark, #8d774b)"
                fontSize="18"
                fontWeight="bold"
                className={!reducedMotion ? "pop-scale" : ""}
              >
                = {plan.resultDecimal}
              </text>
            </g>
          )}
        </g>

        {/* Sparkles burst on combine & result */}
        <Sparkles active={showSparkles} x={96} y={104} reducedMotion={reducedMotion} />
      </svg>
    </div>
  );
}

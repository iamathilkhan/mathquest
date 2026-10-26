import { validateVisualData, type DiagramKind } from "@/lib/diagramData";
import { FractionAddSubAnim } from "./anim/FractionAddSubAnim";
import { DecimalGridAnim } from "./anim/DecimalGridAnim";
import type { FractionAddSubPlan, DecimalGridPlan } from "@/lib/visual/plan";

export function FractionBar({ data }: { data: unknown }) {
  const { n, d } = validateVisualData("fractionBar", data);
  const width = 360;
  const segment = width / d;
  return (
    <div className="diagram-stack">
      <svg
        viewBox="0 0 380 64"
        role="img"
        aria-label={`Fraction bar divided into ${d} equal parts with ${n} shaded`}
        shapeRendering="crispEdges"
      >
        {Array.from({ length: d }, (_, index) => (
          <rect
            key={index}
            x={10 + index * segment}
            y="12"
            width={segment}
            height="38"
            fill={index < n ? "var(--accent, #3fae5a)" : "var(--parchment-dark, #c9b27c)"}
            stroke="var(--ink-brown, #3a2a14)"
            strokeWidth="2"
          />
        ))}
      </svg>
      <NumberLine data={{ min: 0, max: 1, mark: d ? n / d : 0 }} />
    </div>
  );
}

export function NumberLine({ data }: { data: unknown }) {
  const { min, max, mark } = validateVisualData("numberLine", data);
  const x = (value: number) => 22 + ((value - min) / (max - min)) * 336;
  return (
    <svg
      viewBox="0 0 380 70"
      role="img"
      aria-label={`Number line from ${min} to ${max}, marked at ${mark}`}
      shapeRendering="crispEdges"
    >
      <line x1="22" y1="30" x2="358" y2="30" stroke="var(--ink-brown, #3a2a14)" strokeWidth="3" />
      <path d="M22 30l10-6v12z M358 30l-10-6v12z" fill="var(--ink-brown, #3a2a14)" />
      {[0, 1, 2, 3, 4].map((step) => {
        const value = min + ((max - min) * step) / 4;
        const tickX = x(value);
        return (
          <g key={step}>
            <line x1={tickX} y1="23" x2={tickX} y2="38" stroke="var(--ink-brown, #3a2a14)" strokeWidth="2" />
            <text x={tickX} y="59" textAnchor="middle" fill="var(--ink-brown, #3a2a14)" fontSize="12">
              {Number(value.toFixed(2))}
            </text>
          </g>
        );
      })}
      <circle cx={x(mark)} cy="30" r="6" fill="var(--hp-red, #d03a3a)" stroke="var(--ink-brown, #3a2a14)" strokeWidth="2" />
    </svg>
  );
}

export function AreaGrid({ data }: { data: unknown }) {
  const { rows, cols, shaded } = validateVisualData("areaGrid", data);
  const cell = Math.min(32, 300 / cols, 200 / rows);
  return (
    <svg
      viewBox={`0 0 ${cols * cell + 4} ${rows * cell + 4}`}
      role="img"
      aria-label={`Area grid with ${rows} rows, ${cols} columns, and ${shaded} shaded cells`}
      shapeRendering="crispEdges"
    >
      {Array.from({ length: rows * cols }, (_, index) => (
        <rect
          key={index}
          x={2 + (index % cols) * cell}
          y={2 + Math.floor(index / cols) * cell}
          width={cell}
          height={cell}
          fill={index < shaded ? "var(--accent, #3fae5a)" : "var(--parchment-dark, #c9b27c)"}
          stroke="var(--ink-brown, #3a2a14)"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}

export function RatioTable({ data }: { data: unknown }) {
  const { a, b, mult } = validateVisualData("ratioTable", data);
  const rows = Array.from({ length: 4 }, (_, index) => index + 1);
  return (
    <svg
      viewBox="0 0 360 188"
      role="img"
      aria-label={`Ratio table showing ${a} to ${b} multiplied by ${mult}`}
      shapeRendering="crispEdges"
    >
      <rect x="8" y="8" width="344" height="172" fill="var(--parchment, #e9d9ae)" stroke="var(--ink-brown, #3a2a14)" strokeWidth="3" />
      <line x1="180" y1="8" x2="180" y2="180" stroke="var(--ink-brown, #3a2a14)" strokeWidth="3" />
      {rows.map((row) => (
        <g key={row}>
          <line x1="8" y1={36 + row * 36} x2="352" y2={36 + row * 36} stroke="var(--parchment-dark, #c9b27c)" strokeWidth="2" />
          <text x="94" y={35 + row * 36} textAnchor="middle" fill="var(--ink-brown, #3a2a14)" fontSize="16">
            {a * row * mult}
          </text>
          <text x="266" y={35 + row * 36} textAnchor="middle" fill="var(--ink-brown, #3a2a14)" fontSize="16">
            {b * row * mult}
          </text>
        </g>
      ))}
      <text x="94" y="31" textAnchor="middle" fill="var(--ink-brown, #3a2a14)" fontSize="14">
        A
      </text>
      <text x="266" y="31" textAnchor="middle" fill="var(--ink-brown, #3a2a14)" fontSize="14">
        B
      </text>
    </svg>
  );
}

export function Diagram({
  kind,
  data,
  step = 0,
  reducedMotion = false,
}: {
  kind: string;
  data?: unknown;
  step?: number;
  reducedMotion?: boolean;
}) {
  // Check for animated plans first
  if (kind === "fractionAddSub") {
    const plan = (data && typeof data === "object" && "plan" in data ? (data as { plan: FractionAddSubPlan }).plan : data) as FractionAddSubPlan;
    if (plan && plan.kind === "fractionAddSub") {
      return <FractionAddSubAnim plan={plan} step={step} reducedMotion={reducedMotion} />;
    }
    // Fall back to FractionBar
    return <FractionBar data={{ n: 1, d: 2 }} />;
  }

  if (kind === "decimalGrid") {
    const plan = (data && typeof data === "object" && "plan" in data ? (data as { plan: DecimalGridPlan }).plan : data) as DecimalGridPlan;
    if (plan && plan.kind === "decimalGrid") {
      return <DecimalGridAnim plan={plan} step={step} reducedMotion={reducedMotion} />;
    }
    // Fall back to AreaGrid
    return <AreaGrid data={{ rows: 10, cols: 10, shaded: 30 }} />;
  }

  // Existing static diagrams
  if (kind === "fractionBar") return <FractionBar data={data} />;
  if (kind === "numberLine") return <NumberLine data={data} />;
  if (kind === "areaGrid") return <AreaGrid data={data} />;
  if (kind === "ratioTable") return <RatioTable data={data} />;

  // Final fallback to text
  return (
    <div className="diagram-fallback" role="img" aria-label="A step-by-step math diagram">
      Review the quantities, choose an operation, and check the result.
    </div>
  );
}

export function isDiagramKind(value: string): value is DiagramKind | "fractionAddSub" | "decimalGrid" {
  return (
    value === "fractionBar" ||
    value === "numberLine" ||
    value === "areaGrid" ||
    value === "ratioTable" ||
    value === "fractionAddSub" ||
    value === "decimalGrid"
  );
}

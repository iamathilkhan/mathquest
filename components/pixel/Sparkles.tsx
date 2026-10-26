"use client";

import React from "react";

const PARTICLES = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2;
  const dist = 24 + (i % 3) * 10;
  return {
    dx: Math.round(Math.cos(angle) * dist),
    dy: Math.round(Math.sin(angle) * dist),
    color: ["#ffd700", "#ffec80", "#4ade80", "#60a5fa", "#f472b6"][i % 5],
    delay: (i % 3) * 0.05,
  };
});

export function Sparkles({
  active,
  x = 0,
  y = 0,
  reducedMotion = false,
}: {
  active: boolean;
  x?: number;
  y?: number;
  reducedMotion?: boolean;
}) {
  if (!active || reducedMotion) return null;

  return (
    <g className="sparkles-burst" transform={`translate(${x}, ${y})`} pointerEvents="none">
      {PARTICLES.map((p, idx) => (
        <rect
          key={idx}
          className="sparkle-particle"
          x={-3}
          y={-3}
          width={6}
          height={6}
          fill={p.color}
          style={{
            transform: `translate(${p.dx}px, ${p.dy}px)`,
            animationDelay: `${p.delay}s`,
            transition: "transform 0.4s cubic-bezier(0.1, 0.9, 0.2, 1), opacity 0.4s ease",
          }}
        />
      ))}
    </g>
  );
}

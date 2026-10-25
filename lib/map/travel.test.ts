/**
 * lib/map/travel.test.ts
 *
 * Tests for route building and position interpolation: endpoints, midpoints, facing, duration.
 */
import { describe, it, expect } from "vitest";
import { buildRoute, positionAt, durationMs, type Route } from "./travel";
import type { Graph } from "./pathfinding";

describe("buildRoute", () => {
  const simpleGraph: Graph = {
    nodes: [
      { id: "a", x: 0, y: 0 },
      { id: "b", x: 10, y: 10 },
      { id: "c", x: 20, y: 0 },
    ],
    edges: [
      { from: "a", to: "b", waypoints: [{ x: 5, y: 5 }] },
      { from: "b", to: "c", waypoints: [{ x: 15, y: 5 }] },
    ],
  };

  it("builds route with waypoints from edges", () => {
    const route = buildRoute(simpleGraph, ["a", "b", "c"]);
    expect(route.waypoints.length).toBeGreaterThanOrEqual(3); // at least start, end, and intermediate
    expect(route.waypoints[0]).toEqual({ x: 0, y: 0 }); // start
    // Last waypoint is the final node 'c'
    expect(route.waypoints[route.waypoints.length - 1]).toEqual({ x: 20, y: 0 }); // end
  });

  it("calculates cumulative lengths correctly", () => {
    const route = buildRoute(simpleGraph, ["a", "b", "c"]);
    expect(route.lengths[0]).toBe(0); // start
    expect(route.lengths[route.lengths.length - 1]).toBe(route.totalLength); // end
    const isIncreasing = route.lengths.every((len, i) => i === 0 || len >= route.lengths[i - 1]);
    expect(isIncreasing).toBe(true);
  });

  it("single-node route has zero length", () => {
    const route = buildRoute(simpleGraph, ["a"]);
    expect(route.totalLength).toBe(0);
  });

  it("two-node route calculates distance correctly", () => {
    const route = buildRoute(simpleGraph, ["a", "b"]);
    const dx = 10 - 0;
    const dy = 10 - 0;
    const expected = Math.sqrt(dx * dx + dy * dy);
    expect(Math.abs(route.totalLength - expected)).toBeLessThan(0.1);
  });
});

describe("positionAt", () => {
  const testRoute: Route = {
    waypoints: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
    ],
    lengths: [0, 10, 20],
    totalLength: 20,
  };

  it("returns start position at t=0", () => {
    const pos = positionAt(testRoute, 0);
    expect(pos.x).toBe(0);
    expect(pos.y).toBe(0);
  });

  it("returns end position at t=1", () => {
    const pos = positionAt(testRoute, 1);
    expect(pos.x).toBe(20);
    expect(pos.y).toBe(0);
  });

  it("interpolates midpoint at t=0.5", () => {
    const pos = positionAt(testRoute, 0.5);
    expect(pos.x).toBeCloseTo(10, 1);
    expect(pos.y).toBe(0);
  });

  it("clamps t to [0, 1]", () => {
    const pos1 = positionAt(testRoute, -0.5);
    const pos2 = positionAt(testRoute, 1.5);
    expect(pos1.x).toBe(0);
    expect(pos2.x).toBe(20);
  });

  it("detects facing direction correctly", () => {
    // Rightward route
    const rightRoute: Route = {
      waypoints: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      lengths: [0, 10],
      totalLength: 10,
    };
    const rightPos = positionAt(rightRoute, 0.5);
    expect(rightPos.facing).toBe("right");

    // Leftward route
    const leftRoute: Route = {
      waypoints: [
        { x: 10, y: 0 },
        { x: 0, y: 0 },
      ],
      lengths: [0, 10],
      totalLength: 10,
    };
    const leftPos = positionAt(leftRoute, 0.5);
    expect(leftPos.facing).toBe("left");
  });

  it("handles curved routes (with intermediate waypoints)", () => {
    const curvedRoute: Route = {
      waypoints: [
        { x: 0, y: 0 },
        { x: 5, y: 5 },
        { x: 10, y: 0 },
      ],
      lengths: [0, Math.sqrt(50), Math.sqrt(50) + Math.sqrt(50)],
      totalLength: Math.sqrt(50) * 2,
    };
    const pos = positionAt(curvedRoute, 0.5);
    expect(pos.x).toBeCloseTo(5, 0);
    expect(pos.y).toBeCloseTo(5, 0);
  });
});

describe("durationMs", () => {
  it("clamps to minimum 600ms for short routes", () => {
    const shortRoute: Route = {
      waypoints: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
      lengths: [0, 1],
      totalLength: 1,
    };
    // Very short route: 600 + (1/100)*1200 = 612ms
    expect(durationMs(shortRoute)).toBeGreaterThanOrEqual(600);
    expect(durationMs(shortRoute)).toBeLessThan(700);
  });

  it("clamps to maximum 1800ms", () => {
    const veryLongRoute: Route = {
      waypoints: [
        { x: 0, y: 0 },
        { x: 200, y: 0 },
      ],
      lengths: [0, 200],
      totalLength: 200,
    };
    expect(durationMs(veryLongRoute)).toBeLessThanOrEqual(1800);
  });

  it("scales with length", () => {
    const short: Route = {
      waypoints: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      lengths: [0, 10],
      totalLength: 10,
    };
    const long: Route = {
      waypoints: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      lengths: [0, 100],
      totalLength: 100,
    };
    const shortDur = durationMs(short);
    const longDur = durationMs(long);
    expect(longDur).toBeGreaterThan(shortDur);
  });
});

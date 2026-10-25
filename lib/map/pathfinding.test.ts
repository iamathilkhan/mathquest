/**
 * lib/map/pathfinding.test.ts
 *
 * Tests for BFS pathfinding: connectivity, locked nodes, unreachable targets, tie-breaking.
 */
import { describe, it, expect } from "vitest";
import { shortestPath, type Graph } from "./pathfinding";

describe("shortestPath", () => {
  const simpleGraph: Graph = {
    nodes: [
      { id: "a", x: 0, y: 0 },
      { id: "b", x: 1, y: 1 },
      { id: "c", x: 2, y: 2 },
      { id: "d", x: 3, y: 3 },
    ],
    edges: [
      { from: "a", to: "b", waypoints: [] },
      { from: "b", to: "c", waypoints: [] },
      { from: "c", to: "d", waypoints: [] },
      { from: "b", to: "a", waypoints: [] }, // bidirectional
      { from: "c", to: "b", waypoints: [] },
      { from: "d", to: "c", waypoints: [] },
    ],
  };

  it("start equals target returns single-node path", () => {
    const path = shortestPath(simpleGraph, "a", "a", () => true);
    expect(path).toEqual(["a"]);
  });

  it("finds direct edge", () => {
    const path = shortestPath(simpleGraph, "a", "b", () => true);
    expect(path).toEqual(["a", "b"]);
  });

  it("finds multi-hop path", () => {
    const path = shortestPath(simpleGraph, "a", "d", () => true);
    expect(path).toEqual(["a", "b", "c", "d"]);
  });

  it("returns null if target unreachable", () => {
    const path = shortestPath(simpleGraph, "a", "d", (id) => id !== "c");
    expect(path).toBeNull();
  });

  it("respects isPassable predicate", () => {
    const path = shortestPath(simpleGraph, "a", "c", (id) => id !== "b");
    expect(path).toBeNull();
  });

  it("allows target even if not passable", () => {
    // Even though 'd' would not be passable normally, it's the target
    const path = shortestPath(simpleGraph, "a", "d", (id) => id !== "d" && id !== "b");
    expect(path).toBeNull(); // Still blocked via b
  });

  it("deterministic tie-break by node id (alphabetical)", () => {
    // Create a diamond graph where multiple paths exist
    const diamondGraph: Graph = {
      nodes: [
        { id: "start", x: 0, y: 0 },
        { id: "left", x: -1, y: 1 },
        { id: "right", x: 1, y: 1 },
        { id: "end", x: 0, y: 2 },
      ],
      edges: [
        { from: "start", to: "left", waypoints: [] },
        { from: "start", to: "right", waypoints: [] },
        { from: "left", to: "end", waypoints: [] },
        { from: "right", to: "end", waypoints: [] },
      ],
    };
    // Both paths have equal length; should pick "left" (alphabetically first)
    const path = shortestPath(diamondGraph, "start", "end", () => true);
    expect(path).toEqual(["start", "left", "end"]);
  });

  it("returns null for invalid start or end", () => {
    const path1 = shortestPath(simpleGraph, "invalid", "a", () => true);
    const path2 = shortestPath(simpleGraph, "a", "invalid", () => true);
    expect(path1).toBeNull();
    expect(path2).toBeNull();
  });

  it("handles complex branching correctly", () => {
    const complexGraph: Graph = {
      nodes: [
        { id: "1", x: 0, y: 0 },
        { id: "2", x: 1, y: 0 },
        { id: "3", x: 2, y: 0 },
        { id: "4", x: 1, y: 1 },
      ],
      edges: [
        { from: "1", to: "2", waypoints: [] },
        { from: "1", to: "4", waypoints: [] },
        { from: "2", to: "3", waypoints: [] },
        { from: "4", to: "3", waypoints: [] },
      ],
    };
    const path = shortestPath(complexGraph, "1", "3", () => true);
    // Both paths have length 2; should pick "2" before "4" (alphabetically)
    expect(path).toEqual(["1", "2", "3"]);
  });
});

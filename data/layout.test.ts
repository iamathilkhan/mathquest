/**
 * data/layout.test.ts
 *
 * Tests for world map graph structure: edge validity, connectivity, coordinates.
 */
import { describe, it, expect } from "vitest";
import { MAP_GRAPH, REALM_MAP_LAYOUT } from "./layout";
import { ENABLED_REALMS } from "@/lib/config";

describe("MAP_GRAPH", () => {
  it("every edge references valid realm nodes", () => {
    const nodeIds = new Set(MAP_GRAPH.nodes.map((n) => n.id));
    for (const edge of MAP_GRAPH.edges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
    }
  });

  it("has exactly 6 nodes (one per realm)", () => {
    expect(MAP_GRAPH.nodes.length).toBe(6);
  });

  it("all nodes exist in REALM_MAP_LAYOUT", () => {
    for (const node of MAP_GRAPH.nodes) {
      expect(REALM_MAP_LAYOUT[node.id as typeof ENABLED_REALMS[number]]).toBeDefined();
    }
  });

  it("node coordinates match REALM_MAP_LAYOUT", () => {
    for (const node of MAP_GRAPH.nodes) {
      const layout = REALM_MAP_LAYOUT[node.id as typeof ENABLED_REALMS[number]];
      expect(node.x).toBe(layout.x);
      expect(node.y).toBe(layout.y);
    }
  });

  it("all coordinates are within 0-100 range", () => {
    for (const node of MAP_GRAPH.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(100);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeLessThanOrEqual(100);
    }
  });

  it("graph is connected (can reach every node from g5-fractions)", () => {
    // Simple BFS connectivity check
    const visited = new Set<string>();
    const queue = ["g5-fractions"];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const edges = MAP_GRAPH.edges.filter((e) => e.from === current);
      for (const edge of edges) {
        if (!visited.has(edge.to)) queue.push(edge.to);
      }
    }
    expect(visited.size).toBe(6);
  });

  it("waypoints are within bounds 0-100", () => {
    for (const edge of MAP_GRAPH.edges) {
      for (const wp of edge.waypoints) {
        expect(wp.x).toBeGreaterThanOrEqual(0);
        expect(wp.x).toBeLessThanOrEqual(100);
        expect(wp.y).toBeGreaterThanOrEqual(0);
        expect(wp.y).toBeLessThanOrEqual(100);
      }
    }
  });

  it("no duplicate edges (from + to pairs)", () => {
    const edgePairs = new Set<string>();
    for (const edge of MAP_GRAPH.edges) {
      const pair = `${edge.from}->${edge.to}`;
      expect(edgePairs.has(pair)).toBe(false);
      edgePairs.add(pair);
    }
  });

  it("realm markers do not overlap (distance > 0)", () => {
    const nodes = MAP_GRAPH.nodes;
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        expect(dist).toBeGreaterThan(0);
      }
    }
  });
});

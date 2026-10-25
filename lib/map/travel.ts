/**
 * lib/map/travel.ts
 *
 * Route building and position interpolation for traveling between realms.
 * PURE functions, no I/O.
 */

import type { Graph } from "./pathfinding";

export interface Route {
  waypoints: Array<{ x: number; y: number }>;
  lengths: number[]; // cumulative distance at each waypoint
  totalLength: number;
}

/**
 * buildRoute: given a node path and the graph, construct a polyline of waypoints
 * with cumulative lengths.
 *
 * Each edge in nodePath is looked up in the graph; if it has waypoints, those are
 * included; otherwise a straight line is drawn. The result is a smooth route from
 * the start to the end node.
 */
export function buildRoute(graph: Graph, nodePath: string[]): Route {
  const waypoints: Array<{ x: number; y: number }> = [];
  const lengths: number[] = [0];
  let totalLength = 0;

  for (let i = 0; i < nodePath.length; i += 1) {
    const nodeId = nodePath[i];
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    if (i === 0) {
      // Start node
      waypoints.push({ x: node.x, y: node.y });
      continue;
    }

    // Find the edge and its waypoints
    const prevNodeId = nodePath[i - 1];
    const edge = graph.edges.find((e) => e.from === prevNodeId && e.to === nodeId);
    const edgeWaypoints = edge?.waypoints ?? [];

    // Add intermediate waypoints and accumulate distances
    for (const wp of edgeWaypoints) {
      const dx = wp.x - waypoints[waypoints.length - 1].x;
      const dy = wp.y - waypoints[waypoints.length - 1].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      totalLength += dist;
      waypoints.push(wp);
      lengths.push(totalLength);
    }

    // Add current node
    const dx = node.x - waypoints[waypoints.length - 1].x;
    const dy = node.y - waypoints[waypoints.length - 1].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    totalLength += dist;
    waypoints.push({ x: node.x, y: node.y });
    lengths.push(totalLength);
  }

  return { waypoints, lengths, totalLength };
}

export interface Position {
  x: number;
  y: number;
  facing: "left" | "right";
}

/**
 * positionAt: interpolate position along a route at parameter t ∈ [0, 1].
 *
 * t = 0 is the start; t = 1 is the end. Facing direction is determined by
 * the direction of travel (left if moving left, right if moving right).
 */
export function positionAt(route: Route, t: number): Position {
  const clamped = Math.max(0, Math.min(1, t));
  const targetLength = clamped * route.totalLength;

  // Find the segment we're in
  let segmentIndex = 0;
  for (let i = 1; i < route.lengths.length; i += 1) {
    if (route.lengths[i] >= targetLength) {
      segmentIndex = i - 1;
      break;
    }
    segmentIndex = i;
  }

  const start = route.waypoints[segmentIndex];
  const end = route.waypoints[Math.min(segmentIndex + 1, route.waypoints.length - 1)];

  if (!start || !end) {
    return { x: start?.x ?? 0, y: start?.y ?? 0, facing: "right" };
  }

  // Interpolate within this segment
  const segmentStart = route.lengths[segmentIndex];
  const segmentEnd = route.lengths[segmentIndex + 1];
  const segmentLength = segmentEnd - segmentStart;
  const segmentT = segmentLength > 0 ? (targetLength - segmentStart) / segmentLength : 0;

  const x = start.x + (end.x - start.x) * segmentT;
  const y = start.y + (end.y - start.y) * segmentT;

  // Facing: left if end.x < start.x, right otherwise
  const facing = end.x < start.x ? "left" : "right";

  return { x, y, facing };
}

/**
 * durationMs: travel duration in milliseconds based on route length.
 *
 * Scales with length (longer routes take proportionally longer), clamped to 600–1800 ms.
 * Formula: 600 + (totalLength / 100) * 1200, clamped.
 */
export function durationMs(route: Route): number {
  const baseDuration = 600 + (route.totalLength / 100) * 1200;
  return Math.max(600, Math.min(1800, baseDuration));
}

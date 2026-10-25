import type { RealmId } from "@/lib/config";
import type { Graph } from "@/lib/map/pathfinding";

export interface MapPoint {
  x: number;
  y: number;
}

export const REALM_MAP_LAYOUT: Record<RealmId, MapPoint> = {
  "g5-fractions": { x: 14, y: 29 },
  "g5-decimals": { x: 45, y: 61 },
  "g5-volume": { x: 76, y: 34 },
  "g6-ratios": { x: 20, y: 70 },
  "g6-fracdiv": { x: 52, y: 29 },
  "g6-area": { x: 82, y: 64 },
};

/**
 * MAP_GRAPH: connectivity between realms for pathfinding.
 * Grade 5 chain: fractions → decimals → volume
 * Grade 6 chain: ratios → fracdiv → area
 * Cross-grade bridges: fractions ↔ ratios (unlock both grades)
 */
export const MAP_GRAPH: Graph = {
  nodes: [
    { id: "g5-fractions", x: 14, y: 29 },
    { id: "g5-decimals", x: 45, y: 61 },
    { id: "g5-volume", x: 76, y: 34 },
    { id: "g6-ratios", x: 20, y: 70 },
    { id: "g6-fracdiv", x: 52, y: 29 },
    { id: "g6-area", x: 82, y: 64 },
  ],
  edges: [
    // Grade 5 chain (left to right)
    { from: "g5-fractions", to: "g5-decimals", waypoints: [{ x: 30, y: 45 }] },
    { from: "g5-decimals", to: "g5-volume", waypoints: [{ x: 60, y: 48 }] },

    // Grade 6 chain (left to right)
    { from: "g6-ratios", to: "g6-fracdiv", waypoints: [{ x: 35, y: 50 }] },
    { from: "g6-fracdiv", to: "g6-area", waypoints: [{ x: 67, y: 47 }] },

    // Cross-grade bridges
    { from: "g5-fractions", to: "g6-ratios", waypoints: [{ x: 17, y: 50 }] },
    { from: "g6-ratios", to: "g5-fractions", waypoints: [{ x: 17, y: 50 }] },

    // Bidirectional within grade
    { from: "g5-decimals", to: "g5-fractions", waypoints: [{ x: 30, y: 45 }] },
    { from: "g5-volume", to: "g5-decimals", waypoints: [{ x: 60, y: 48 }] },
    { from: "g6-fracdiv", to: "g6-ratios", waypoints: [{ x: 35, y: 50 }] },
    { from: "g6-area", to: "g6-fracdiv", waypoints: [{ x: 67, y: 47 }] },
  ],
};

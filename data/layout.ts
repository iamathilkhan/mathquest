import type { RealmId } from "@/lib/config";

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

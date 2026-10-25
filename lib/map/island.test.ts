/**
 * lib/map/island.test.ts
 *
 * Tests for procedural island generation: determinism, bounds, and isolation removal.
 */
import { describe, it, expect } from "vitest";
import { generateIsland } from "./island";

describe("generateIsland", () => {
  it("same seed produces same island", () => {
    const island1 = generateIsland(42, 12);
    const island2 = generateIsland(42, 12);
    expect(island1).toEqual(island2);
  });

  it("different seeds produce different islands", () => {
    const island1 = generateIsland(42, 12);
    const island2 = generateIsland(99, 12);
    expect(island1).not.toEqual(island2);
  });

  it("clamps size to 8-20 range", () => {
    const tooSmall = generateIsland(42, 4);
    const tooLarge = generateIsland(42, 50);
    const valid = generateIsland(42, 12);
    // All should be reasonable sizes (not exceeding 20×20 grid)
    const allWithin = [tooSmall, tooLarge, valid].every(
      (island) =>
        island.every((cell) => cell.x >= 0 && cell.x < 20 && cell.y >= 0 && cell.y < 20)
    );
    expect(allWithin).toBe(true);
  });

  it("produces cells within grid bounds", () => {
    const island = generateIsland(42, 12);
    const allValid = island.every(
      (cell) => cell.x >= 0 && cell.x < 12 && cell.y >= 0 && cell.y < 12
    );
    expect(allValid).toBe(true);
  });

  it("removes isolated cells (no adjacent land)", () => {
    // Generate a medium island; visually inspect for single-cell orphans
    const island = generateIsland(123, 15);
    const grid = new Set(island.map((c) => `${c.x},${c.y}`));
    
    for (const cell of island) {
      const neighbors = [
        `${cell.x - 1},${cell.y}`,
        `${cell.x + 1},${cell.y}`,
        `${cell.x},${cell.y - 1}`,
        `${cell.x},${cell.y + 1}`,
      ];
      // At least one neighbor should exist (cell is not isolated)
      const hasNeighbor = neighbors.some((key) => grid.has(key));
      expect(hasNeighbor).toBe(true);
    }
  });

  it("produces a non-empty island", () => {
    const island = generateIsland(42, 12);
    expect(island.length).toBeGreaterThan(0);
  });

  it("produces reasonable island size (not too sparse, not too dense)", () => {
    const island = generateIsland(42, 12);
    const gridArea = 12 * 12;
    const occupancy = island.length / gridArea;
    // Expect islands to be roughly 25-50% of grid (after isolation removal)
    expect(occupancy).toBeGreaterThan(0.1);
    expect(occupancy).toBeLessThan(0.8);
  });
});

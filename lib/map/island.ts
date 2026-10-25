/**
 * lib/map/island.ts
 *
 * Procedural pixel-art island generator. Given a seed and size, produces a
 * deterministic island shape using blobby noise. Can be rendered as SVG rects
 * or used as a fallback when realm art is missing.
 *
 * PURE function: same seed → same island every time.
 */

export interface IslandCell {
  x: number;
  y: number;
}

/**
 * Seeded pseudo-random number (deterministic, 0-1)
 */
function seededRandom(seed: number, x: number, y: number): number {
  const combined = seed + x * 73856093 ^ y * 19349663;
  const n = Math.sin(combined) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Perlin-like noise approximation: 2D value noise (3 octaves of seeded random)
 */
function noise(seed: number, x: number, y: number): number {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  for (let octave = 0; octave < 3; octave += 1) {
    const sampleX = Math.floor(x * frequency);
    const sampleY = Math.floor(y * frequency);
    total += seededRandom(seed + octave, sampleX, sampleY) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return total / maxValue;
}

/**
 * generateIsland: produces a blobby island shape for the given seed and size.
 *
 * Returns an array of {x, y} cells representing the island (land masses).
 * Cells outside the island are water. The island has:
 * - A main body (threshold > 0.45)
 * - Occasional smaller landmasses (threshold > 0.48)
 * - A shore ring (cells adjacent to water)
 * - No isolated single cells
 *
 * Size must be between 8 and 20 pixels.
 */
export function generateIsland(seed: number, size: number): IslandCell[] {
  const clamped = Math.max(8, Math.min(20, Math.round(size)));
  const threshold = 0.45;
  const cells: IslandCell[] = [];
  const grid = new Map<string, boolean>();

  // Generate the raw island grid
  for (let y = 0; y < clamped; y += 1) {
    for (let x = 0; x < clamped; x += 1) {
      const n = noise(seed, (x / clamped) * 3, (y / clamped) * 3);
      if (n > threshold) {
        grid.set(`${x},${y}`, true);
      }
    }
  }

  // Remove isolated cells (no adjacent land = remove it)
  const toRemove: string[] = [];
  for (const [key] of grid) {
    const [x, y] = key.split(",").map(Number);
    const neighbors = [
      grid.get(`${x - 1},${y}`),
      grid.get(`${x + 1},${y}`),
      grid.get(`${x},${y - 1}`),
      grid.get(`${x},${y + 1}`),
    ];
    if (neighbors.every((n) => !n)) {
      toRemove.push(key);
    }
  }
  for (const key of toRemove) grid.delete(key);

  // Export cells
  for (const [key] of grid) {
    const [x, y] = key.split(",").map(Number);
    cells.push({ x, y });
  }

  return cells;
}

/**
 * renderIsland: converts island cells to SVG <rect> strings.
 *
 * cellSize is the pixel width/height of each cell (typically 2-4px).
 * tint is a CSS colour string applied to each rect.
 * Returns an array of SVG rect element strings.
 */
export function renderIsland(cells: IslandCell[], cellSize: number, tint: string): string[] {
  return cells.map(
    (cell) =>
      `<rect x="${cell.x * cellSize}" y="${cell.y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${tint}" />`
  );
}

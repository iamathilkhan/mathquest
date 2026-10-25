import { describe, expect, it } from "vitest";
import { validateVisualData } from "./diagramData";

describe("validateVisualData", () => {
  it("bounds fractions to d 1-12 and n 0-d", () => {
    expect(validateVisualData("fractionBar", { n: 20, d: 99 })).toEqual({ n: 12, d: 12 });
    expect(validateVisualData("fractionBar", { n: -3, d: 0 })).toEqual({ n: 0, d: 1 });
    expect(validateVisualData("fractionBar", null)).toEqual({ n: 3, d: 4 });
  });

  it("uses a safe number line default for non-increasing endpoints and clamps the mark", () => {
    expect(validateVisualData("numberLine", { min: 2, max: 2, mark: 8 })).toEqual({ min: 0, max: 1, mark: 0.5 });
    expect(validateVisualData("numberLine", { min: -2, max: 3, mark: 9 })).toEqual({ min: -2, max: 3, mark: 3 });
    expect(validateVisualData("numberLine", { min: 0, max: 1, mark: Number.NaN })).toEqual({ min: 0, max: 1, mark: 0.5 });
  });

  it("bounds area grid dimensions and shaded cells", () => {
    expect(validateVisualData("areaGrid", { rows: 20, cols: 0, shaded: 500 })).toEqual({ rows: 12, cols: 1, shaded: 12 });
    expect(validateVisualData("areaGrid", { rows: 3, cols: 4, shaded: -5 })).toEqual({ rows: 3, cols: 4, shaded: 0 });
  });

  it("bounds ratio terms and multiplier", () => {
    expect(validateVisualData("ratioTable", { a: -2, b: 99, mult: 8 })).toEqual({ a: 1, b: 50, mult: 6 });
    expect(validateVisualData("ratioTable", {})).toEqual({ a: 2, b: 3, mult: 2 });
  });
});

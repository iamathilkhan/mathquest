export type DiagramKind = "fractionBar" | "numberLine" | "areaGrid" | "ratioTable";

export type FractionBarData = { n: number; d: number };
export type NumberLineData = { min: number; max: number; mark: number };
export type AreaGridData = { rows: number; cols: number; shaded: number };
export type RatioTableData = { a: number; b: number; mult: number };
export type DiagramData = FractionBarData | NumberLineData | AreaGridData | RatioTableData;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const int = (value: unknown): value is number => finite(value) && Number.isInteger(value);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function validateVisualData(kind: "fractionBar", input: unknown): FractionBarData;
export function validateVisualData(kind: "numberLine", input: unknown): NumberLineData;
export function validateVisualData(kind: "areaGrid", input: unknown): AreaGridData;
export function validateVisualData(kind: "ratioTable", input: unknown): RatioTableData;
export function validateVisualData(kind: DiagramKind, input: unknown): DiagramData;
export function validateVisualData(kind: DiagramKind, input: unknown): DiagramData {
  const data = isRecord(input) ? input : {};
  switch (kind) {
    case "fractionBar": {
      const rawD = int(data.d) ? data.d : 4;
      const d = clamp(rawD, 1, 12);
      const rawN = int(data.n) ? data.n : 3;
      return { n: clamp(rawN, 0, d), d };
    }
    case "numberLine": {
      const min = finite(data.min) ? data.min : 0;
      const max = finite(data.max) ? data.max : 1;
      if (min >= max) return { min: 0, max: 1, mark: 0.5 };
      const rawMark = finite(data.mark) ? data.mark : (min + max) / 2;
      return { min, max, mark: clamp(rawMark, min, max) };
    }
    case "areaGrid": {
      const rows = clamp(int(data.rows) ? data.rows : 4, 1, 12);
      const cols = clamp(int(data.cols) ? data.cols : 4, 1, 12);
      const shaded = clamp(int(data.shaded) ? data.shaded : 8, 0, rows * cols);
      return { rows, cols, shaded };
    }
    case "ratioTable": {
      return {
        a: clamp(int(data.a) ? data.a : 2, 1, 50),
        b: clamp(int(data.b) ? data.b : 3, 1, 50),
        mult: clamp(int(data.mult) ? data.mult : 2, 1, 6),
      };
    }
  }
}

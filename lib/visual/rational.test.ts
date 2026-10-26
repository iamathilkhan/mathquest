import { describe, expect, it } from "vitest";
import {
  gcd,
  rational,
  add,
  sub,
  mul,
  compare,
  toMixedNumber,
  toDecimalString,
  parseRational,
} from "./rational";

describe("rational ops (pure exact rational, no floats)", () => {
  it.each([
    [12, 18, 6],
    [7, 13, 1],
    [0, 5, 5],
    [15, 0, 15],
    [24, 36, 12],
  ])("gcd(%i, %i) === %i", (a, b, expected) => {
    expect(gcd(a, b)).toBe(expected);
  });

  it.each([
    // [n1, d1, n2, d2, expectedN, expectedD]
    [1, 4, 2, 4, 3, 4],
    [1, 3, 1, 6, 1, 2],
    [3, 5, 2, 5, 1, 1],
    [0, 1, 2, 3, 2, 3],
  ])("add(%i/%i, %i/%i) -> %i/%i", (n1, d1, n2, d2, en, ed) => {
    const res = add(rational(n1, d1), rational(n2, d2));
    expect(res).toEqual({ n: en, d: ed });
  });

  it.each([
    [3, 4, 1, 4, 1, 2],
    [1, 2, 1, 3, 1, 6],
    [5, 8, 1, 8, 1, 2],
  ])("sub(%i/%i, %i/%i) -> %i/%i", (n1, d1, n2, d2, en, ed) => {
    const res = sub(rational(n1, d1), rational(n2, d2));
    expect(res).toEqual({ n: en, d: ed });
  });

  it.each([
    [2, 3, 3, 4, 1, 2],
    [0, 1, 5, 8, 0, 1],
    [3, 4, 4, 3, 1, 1],
  ])("mul(%i/%i, %i/%i) -> %i/%i", (n1, d1, n2, d2, en, ed) => {
    const res = mul(rational(n1, d1), rational(n2, d2));
    expect(res).toEqual({ n: en, d: ed });
  });

  it.each([
    [1, 3, 1, 2, -1],
    [2, 4, 1, 2, 0],
    [3, 4, 2, 3, 1],
  ])("compare(%i/%i, %i/%i) -> %i", (n1, d1, n2, d2, expected) => {
    expect(compare(rational(n1, d1), rational(n2, d2))).toBe(expected);
  });

  it.each([
    [7, 4, { whole: 1, n: 3, d: 4 }],
    [4, 4, { whole: 1, n: 0, d: 1 }],
    [2, 5, { whole: 0, n: 2, d: 5 }],
  ])("toMixedNumber(%i/%i)", (n, d, expected) => {
    expect(toMixedNumber(rational(n, d))).toEqual(expected);
  });

  it.each([
    [3, 4, "0.75"],
    [1, 8, "0.125"],
    [1, 2, "0.5"],
    [0, 1, "0"],
    [5, 1, "5"],
  ])("toDecimalString(%i/%i) -> %s", (n, d, expected) => {
    expect(toDecimalString(rational(n, d))).toBe(expected);
  });

  it.each([
    ["3/4", { n: 3, d: 4 }],
    ["0.75", { n: 3, d: 4 }],
    ["0.3", { n: 3, d: 10 }],
    ["5", { n: 5, d: 1 }],
  ])("parseRational(%s)", (s, expected) => {
    expect(parseRational(s)).toEqual(expected);
  });
});

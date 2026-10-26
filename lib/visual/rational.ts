/**
 * lib/visual/rational.ts
 * Tiny exact rational arithmetic (gcd, add, sub, mul, compare, mixed number, decimal string).
 * Pure functions, NO floating-point operations.
 */

export interface Rational {
  readonly n: number;
  readonly d: number;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x;
}

export function rational(n: number, d = 1): Rational {
  if (d === 0) {
    throw new Error("Denominator cannot be zero");
  }
  let num = Math.round(n);
  let den = Math.round(d);
  if (den < 0) {
    num = -num;
    den = -den;
  }
  if (num === 0) {
    return { n: 0, d: 1 };
  }
  const g = gcd(num, den);
  return { n: num / g, d: den / g };
}

export function add(a: Rational, b: Rational): Rational {
  return rational(a.n * b.d + b.n * a.d, a.d * b.d);
}

export function sub(a: Rational, b: Rational): Rational {
  return rational(a.n * b.d - b.n * a.d, a.d * b.d);
}

export function mul(a: Rational, b: Rational): Rational {
  return rational(a.n * b.n, a.d * b.d);
}

export function compare(a: Rational, b: Rational): number {
  const diff = a.n * b.d - b.n * a.d;
  if (diff > 0) return 1;
  if (diff < 0) return -1;
  return 0;
}

export function toMixedNumber(r: Rational): { whole: number; n: number; d: number } {
  const sign = r.n < 0 ? -1 : 1;
  const absN = Math.abs(r.n);
  const whole = Math.floor(absN / r.d) * sign;
  const rem = absN % r.d;
  return { whole, n: rem, d: r.d };
}

export function toDecimalString(r: Rational, maxDecimals = 8): string {
  if (r.n === 0) return "0";
  const sign = r.n < 0 ? "-" : "";
  const absN = Math.abs(r.n);
  const whole = Math.floor(absN / r.d);
  let rem = absN % r.d;
  if (rem === 0) return `${sign}${whole}`;

  let decimals = "";
  while (rem !== 0 && decimals.length < maxDecimals) {
    rem *= 10;
    decimals += Math.floor(rem / r.d);
    rem = rem % r.d;
  }
  return `${sign}${whole}.${decimals}`;
}

export function parseRational(s: string): Rational | null {
  const trimmed = s.trim();
  if (!trimmed) return null;

  // Fraction format: a/b
  const fracMatch = trimmed.match(/^(-?\d+)\/(-?\d+)$/);
  if (fracMatch) {
    const d = parseInt(fracMatch[2], 10);
    if (d === 0) return null;
    return rational(parseInt(fracMatch[1], 10), d);
  }

  // Decimal format: a.b or .b
  const decMatch = trimmed.match(/^(-?\d*)\.(\d+)$/);
  if (decMatch) {
    const wholeStr = decMatch[1] === "" || decMatch[1] === "-" ? (decMatch[1] === "-" ? "-0" : "0") : decMatch[1];
    const isNeg = trimmed.startsWith("-");
    const whole = Math.abs(parseInt(wholeStr, 10));
    const decDigits = decMatch[2];
    const power = 10 ** decDigits.length;
    const decVal = parseInt(decDigits, 10);
    const totalNum = whole * power + decVal;
    return rational(isNeg ? -totalNum : totalNum, power);
  }

  // Integer format: a
  const intMatch = trimmed.match(/^(-?\d+)$/);
  if (intMatch) {
    return rational(parseInt(intMatch[1], 10), 1);
  }

  return null;
}

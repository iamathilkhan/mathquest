import fs from "node:fs";
import path from "node:path";

import { ALL_SUBSKILLS, getRealm } from "@/data/curriculum";
import { fractionToString, evalExact } from "@/lib/verify/expression";
import { verifyQuestion } from "@/lib/verify/question";
import type { RawQuestion, Tier } from "@/lib/schemas";

const tiers: Tier[] = ["easy", "medium", "hard"];
const outputDir = path.join(process.cwd(), "data", "seed-questions");

function rationalParts(value: string): [number, number] {
  const [numerator, denominator = "1"] = value.split("/");
  return [Number(numerator), Number(denominator)];
}

function rationalString(numerator: number, denominator: number): string {
  const divisor = (a: number, b: number): number => b === 0 ? a : divisor(b, a % b);
  const gcd = Math.abs(divisor(numerator, denominator));
  const n = numerator / (gcd || 1);
  const d = denominator / (gcd || 1);
  return d === 1 ? String(n) : `${n}/${d}`;
}

function questionParts(subSkillId: string, serial: number): { prompt: string; expression: string } {
  const n = serial + 1;
  const d = 5 + (serial % 5);
  const a = 1 + (serial % 3);
  const b = 1 + ((serial + 1) % 3);
  const realmId = subSkillId.startsWith("g5-") ? subSkillId.slice(0, subSkillId.lastIndexOf("-")) : subSkillId.split("-").slice(0, 2).join("-");
  const skill = ALL_SUBSKILLS.find((item) => item.id === subSkillId)!;

  switch (subSkillId) {
    case "g5-fractions-add-sub":
      return { prompt: `Add these like fractions for ${skill.title}:`, expression: `${a}/${d} + ${b}/${d}` };
    case "g5-fractions-multiply":
      return { prompt: `Multiply the whole number and fraction for ${skill.title}:`, expression: `${a + 1} * (${b}/${d})` };
    case "g5-fractions-divide":
    case "g6-fracdiv-meaning":
      return { prompt: `How many groups of 1/${d} fit into ${a + 1}/${d}?`, expression: `(${a + 1}/${d}) / (1/${d})` };
    case "g6-fracdiv-compute":
    case "g6-fracdiv-word":
      return { prompt: `Divide these fractions for ${skill.title}:`, expression: `(${a + 1}/${d}) / (${b}/${d})` };
    case "g5-decimals-place-value": {
      const digit = 1 + (serial % 9);
      const decimal = `${Math.floor(serial / 9) + 1}.${digit}`;
      return { prompt: `What is the value of the tenths digit in ${decimal}?`, expression: `${digit}/10` };
    }
    case "g5-decimals-ops":
      return { prompt: `Multiply the decimals for ${skill.title}:`, expression: `${n}.${b} * ${b + 1}` };
    case "g5-decimals-powers":
      return { prompt: `Multiply by ten to find the next place value:`, expression: `0.${n}${b} * 10` };
    case "g5-volume-unit":
    case "g5-volume-formula":
      return { prompt: `Find the volume of a ${a + 1} by ${b + 2} by ${n + 1} unit prism:`, expression: `${a + 1} * ${b + 2} * ${n + 1}` };
    case "g5-volume-compose":
      return { prompt: `Add the volumes of prisms ${a} by ${b} by 2 and 2 by 2 by ${n}:`, expression: `(${a} * ${b} * 2) + (2 * 2 * ${n})` };
    case "g6-ratios-concept":
      return { prompt: `Write the ratio ${n * 2}:${n} as a quotient in simplest form:`, expression: `${n * 2} / ${n}` };
    case "g6-ratios-unit-rate":
      return { prompt: `A ${n * b} item pack costs ${n * 3} coins. What is the cost per item?`, expression: `${n * 3} / ${n * b}` };
    case "g6-ratios-percent": {
      const percent = 10 + serial * 5;
      return { prompt: `Find ${percent}% of ${b * 20}:`, expression: `${percent} / 100 * ${b * 20}` };
    }
    case "g6-area-polygons":
      return { prompt: `Find the area of a triangle with base ${n * 2} and height ${b * 2}:`, expression: `${n * 2} * ${b * 2} / 2` };
    case "g6-area-composite":
      return { prompt: `Add the areas of rectangles ${a} by ${b} and ${n} by 2:`, expression: `(${a} * ${b}) + (${n} * 2)` };
    case "g6-area-surface":
      return { prompt: `Find the surface area of a ${a} by ${b} by ${n} rectangular prism:`, expression: `2 * (${a} * ${b} + ${a} * ${n} + ${b} * ${n})` };
    default:
      throw new Error(`No seed question profile for ${realmId}/${subSkillId}`);
  }
}

function makeQuestion(subSkillId: string, tier: Tier, serial: number): ReturnType<typeof verifyQuestion> {
  const { prompt, expression } = questionParts(subSkillId, serial);
  const answer = fractionToString(evalExact(expression));
  const [numerator, denominator] = rationalParts(answer);
  const values = [answer, rationalString(numerator + denominator, denominator), rationalString(numerator + 2 * denominator, denominator), rationalString(numerator + 3 * denominator, denominator)];
  const correctIndex = serial % values.length;
  const ordered = [...values];
  const [correctValue] = ordered.splice(0, 1);
  ordered.splice(correctIndex, 0, correctValue!);
  const raw: RawQuestion = {
    stem: `${prompt} ${expression} = ?`,
    tier,
    expression,
    options: ordered.map((value, index) => ({
      label: value,
      value,
      why: index === correctIndex ? "This matches the exact calculation." : "Check the operation and calculate again.",
    })),
    correctIndex,
    explanation: `Evaluate ${expression} carefully. The exact result is ${answer}; check each operation and unit in the problem.`,
    hint: "Work through one operation at a time, then check the result.",
    subSkillId,
  };
  return verifyQuestion(raw);
}

function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  for (const skill of ALL_SUBSKILLS) {
    const realm = getRealm(skill.realmId);
    const items = [];
    for (const tier of tiers) {
      for (let index = 0; index < 6; index++) {
        const verified = makeQuestion(skill.id, tier, index + tiers.indexOf(tier) * 6);
        if (!verified.ok) throw new Error(`${skill.id}: ${verified.reason} ${verified.detail ?? ""}`);
        items.push({ ...verified.q, source: "seed" as const });
      }
    }
    const target = path.join(outputDir, `${realm.id}__${skill.id}.json`);
    fs.writeFileSync(target, `${JSON.stringify({ items, realmId: realm.id, subSkillId: skill.id, source: "seed" }, null, 2)}\n`);
  }
  console.log(`Generated verified seed questions for ${ALL_SUBSKILLS.length} sub-skills.`);
}

main();

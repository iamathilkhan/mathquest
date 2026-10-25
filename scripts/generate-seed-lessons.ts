import fs from "node:fs";
import path from "node:path";

import { ALL_SUBSKILLS, getRealm } from "@/data/curriculum";
import { verifyLesson } from "@/lib/verify/lesson";
import type { Lesson } from "@/lib/schemas";

const outDir = path.join(process.cwd(), "data", "lessons");

function examplesFor(id: string, title: string): Lesson["workedExamples"] {
  const examples: Record<string, Lesson["workedExamples"]> = {
    "g5-fractions-add-sub": [
      { problem: "Add 1/4 and 2/4 of a recipe.", expression: "1/4 + 2/4", answerValue: "3/4", steps: ["The denominators are both 4.", "Add the numerators: 1 + 2 = 3.", "The sum is 3/4."] },
      { problem: "Add 1/3 and 1/6 of a trail map.", expression: "1/3 + 1/6", answerValue: "1/2", steps: ["Use sixths: 1/3 is 2/6.", "Add 2/6 + 1/6.", "Simplify 3/6 to 1/2."] },
    ],
    "g5-fractions-multiply": [
      { problem: "Find 2 times 1/3 of a length.", expression: "2 * (1/3)", answerValue: "2/3", steps: ["Write 2 as 2/1.", "Multiply numerators and denominators.", "The product is 2/3."] },
      { problem: "Find 2/3 of 3/4 of a garden.", expression: "(2/3) * (3/4)", answerValue: "1/2", steps: ["Multiply the numerators: 2 × 3 = 6.", "Multiply denominators: 3 × 4 = 12.", "Simplify 6/12 to 1/2."] },
    ],
    "g5-fractions-divide": [
      { problem: "How many 1/4 lengths fit in 1/2 length?", expression: "(1/2) / (1/4)", answerValue: "2", steps: ["Ask how many quarter units fit in one half.", "Two quarters make one half.", "So the quotient is 2."] },
      { problem: "How many 1/3 cups fit in 2/3 cup?", expression: "(2/3) / (1/3)", answerValue: "2", steps: ["The pieces are thirds in both amounts.", "Count two one-third pieces.", "The quotient is 2."] },
    ],
    "g5-decimals-place-value": [
      { problem: "In 3.4, what value does the 4 in the tenths place have? Divide 4 by 10.", expression: "4 / 10", answerValue: "0.4", steps: ["The digit 4 is in the tenths place.", "Four tenths is 4 divided by 10.", "The value is 0.4."] },
      { problem: "In 2.35, what value does the 3 in the tenths place have? Divide 3 by 10.", expression: "3 / 10", answerValue: "0.3", steps: ["The digit 3 is in the tenths place.", "Three tenths is 3 divided by 10.", "The value is 0.3."] },
    ],
    "g5-decimals-ops": [
      { problem: "Multiply 1.2 by 3 groups.", expression: "1.2 * 3", answerValue: "3.6", steps: ["Multiply 12 tenths by 3.", "12 × 3 = 36 tenths.", "36 tenths is 3.6."] },
      { problem: "Divide 4.8 into 2 equal groups.", expression: "4.8 / 2", answerValue: "2.4", steps: ["Think of 4.8 as 48 tenths.", "Share 48 tenths equally into 2 groups.", "Each group has 24 tenths, or 2.4."] },
    ],
    "g5-decimals-powers": [
      { problem: "Multiply 0.34 by 10 to shift each digit one place.", expression: "0.34 * 10", answerValue: "3.4", steps: ["Multiplying by 10 moves each digit one place left.", "The decimal point shifts one place right.", "The result is 3.4."] },
      { problem: "Divide 5.6 by 10 to shift each digit one place.", expression: "5.6 / 10", answerValue: "0.56", steps: ["Dividing by 10 moves each digit one place right.", "The decimal point shifts one place left.", "The result is 0.56."] },
    ],
    "g5-volume-unit": [
      { problem: "A box is 2 units long, 3 units wide, and 4 units high. Find its volume.", expression: "2 * 3 * 4", answerValue: "24", steps: ["Volume counts unit cubes.", "Multiply length × width × height.", "2 × 3 × 4 = 24 cubic units."] },
      { problem: "A prism is 3 units long, 2 units wide, and 2 units high. Find its volume.", expression: "3 * 2 * 2", answerValue: "12", steps: ["Use the rectangular prism volume rule.", "Multiply 3 × 2 × 2.", "The volume is 12 cubic units."] },
    ],
    "g5-volume-formula": [
      { problem: "Find the volume of a prism with length 4, width 2, and height 3 units.", expression: "4 * 2 * 3", answerValue: "24", steps: ["Use V = length × width × height.", "Substitute the dimensions: 4 × 2 × 3.", "The volume is 24 cubic units."] },
      { problem: "Find the volume of a prism with length 2, width 2, and height 5 units.", expression: "2 * 2 * 5", answerValue: "20", steps: ["Use V = length × width × height.", "Multiply 2 × 2 × 5.", "The volume is 20 cubic units."] },
    ],
    "g5-volume-compose": [
      { problem: "Two joined boxes have volumes 2 × 2 × 2 and 1 × 2 × 2 cubic units. Find the total.", expression: "(2 * 2 * 2) + (1 * 2 * 2)", answerValue: "12", steps: ["Find the first box volume: 2 × 2 × 2 = 8.", "Find the second box volume: 1 × 2 × 2 = 4.", "Add 8 + 4 = 12 cubic units."] },
      { problem: "Two joined boxes have volumes 1 × 2 × 2 and 2 × 2 × 2 cubic units. Find the total.", expression: "(1 * 2 * 2) + (2 * 2 * 2)", answerValue: "12", steps: ["Find the first box volume: 1 × 2 × 2 = 4.", "Find the second box volume: 2 × 2 × 2 = 8.", "Add 4 + 8 = 12 cubic units."] },
    ],
    "g6-ratios-concept": [
      { problem: "There are 4 blue tiles and 2 gold tiles. Find blue tiles per gold tile.", expression: "4 / 2", answerValue: "2", steps: ["Compare blue tiles to gold tiles: 4 to 2.", "Write the comparison as 4 divided by 2.", "There are 2 blue tiles per gold tile."] },
      { problem: "There are 6 red tiles and 3 blue tiles. Find red tiles per blue tile.", expression: "6 / 3", answerValue: "2", steps: ["Compare red tiles to blue tiles: 6 to 3.", "Write the comparison as 6 divided by 3.", "The unit ratio is 2 to 1."] },
    ],
    "g6-ratios-unit-rate": [
      { problem: "A 3-pack costs 6 coins. Find the cost per item.", expression: "6 / 3", answerValue: "2", steps: ["Divide total cost by number of items.", "6 coins divided by 3 items is 2.", "The unit rate is 2 coins per item."] },
      { problem: "A 4-pack costs 12 coins. Find the cost per item.", expression: "12 / 4", answerValue: "3", steps: ["Divide total cost by number of items.", "12 coins divided by 4 items is 3.", "The unit rate is 3 coins per item."] },
    ],
    "g6-ratios-percent": [
      { problem: "Find 25 percent of 20 points. Percent means per 100.", expression: "25 / 100 * 20", answerValue: "5", steps: ["25 percent means 25 out of 100.", "Multiply 25/100 by 20.", "The result is 5 points."] },
      { problem: "Find 10 percent of 30 points. Percent means per 100.", expression: "10 / 100 * 30", answerValue: "3", steps: ["10 percent means 10 out of 100.", "Multiply 10/100 by 30.", "The result is 3 points."] },
    ],
    "g6-fracdiv-meaning": [
      { problem: "How many 1/4 meter pieces fit in 3/4 meter?", expression: "(3/4) / (1/4)", answerValue: "3", steps: ["Division asks how many groups fit.", "Count the quarter-meter pieces in three quarters.", "Three pieces fit, so the quotient is 3."] },
      { problem: "How many 1/5 liter portions fit in 2/5 liter?", expression: "(2/5) / (1/5)", answerValue: "2", steps: ["The whole amount contains fifths.", "Count the one-fifth portions: there are two.", "The quotient is 2."] },
    ],
    "g6-fracdiv-compute": [
      { problem: "Divide 2/3 by 1/6.", expression: "(2/3) / (1/6)", answerValue: "4", steps: ["Keep 2/3 and multiply by the reciprocal of 1/6.", "Compute 2/3 × 6/1.", "The quotient is 4."] },
      { problem: "Divide 3/4 by 1/8.", expression: "(3/4) / (1/8)", answerValue: "6", steps: ["Keep 3/4 and multiply by the reciprocal of 1/8.", "Compute 3/4 × 8/1.", "The quotient is 6."] },
    ],
    "g6-fracdiv-word": [
      { problem: "A 3/4 meter ribbon is cut into 1/4 meter pieces. How many pieces are made?", expression: "(3/4) / (1/4)", answerValue: "3", steps: ["The total ribbon is 3/4 meter.", "Each piece is 1/4 meter, so divide 3/4 by 1/4.", "Three pieces are made."] },
      { problem: "A 2/3 liter jug is poured into 1/3 liter cups. How many cups are filled?", expression: "(2/3) / (1/3)", answerValue: "2", steps: ["The jug holds 2/3 liter.", "Each cup holds 1/3 liter, so divide 2/3 by 1/3.", "Two cups are filled."] },
    ],
    "g6-area-polygons": [
      { problem: "Find the area of a triangle with base 6 units and height 4 units.", expression: "6 * 4 / 2", answerValue: "12", steps: ["A triangle is half of a matching rectangle.", "Multiply base × height: 6 × 4 = 24.", "Take half: 24 ÷ 2 = 12 square units."] },
      { problem: "Find the area of a rectangle with side lengths 3 units and 5 units.", expression: "3 * 5", answerValue: "15", steps: ["A rectangle's area is length × width.", "Multiply 3 × 5.", "The area is 15 square units."] },
    ],
    "g6-area-composite": [
      { problem: "A shape joins rectangles with areas 3 × 2 and 2 × 2. Find its area.", expression: "(3 * 2) + (2 * 2)", answerValue: "10", steps: ["Split the shape into two rectangles.", "Their areas are 6 and 4 square units.", "Add 6 + 4 = 10 square units."] },
      { problem: "A shape joins rectangles with areas 4 × 2 and 1 × 3. Find its area.", expression: "(4 * 2) + (1 * 3)", answerValue: "11", steps: ["Split the shape into two rectangles.", "Their areas are 8 and 3 square units.", "Add 8 + 3 = 11 square units."] },
    ],
    "g6-area-surface": [
      { problem: "Find the surface area of a prism with length 2, width 3, and height 4 units.", expression: "2 * (2 * 3 + 2 * 4 + 3 * 4)", answerValue: "52", steps: ["Find the three different face areas: 6, 8, and 12.", "Add them and multiply by 2 for opposite faces.", "2 × (6 + 8 + 12) = 52 square units."] },
      { problem: "Find the surface area of a prism with length 1, width 2, and height 3 units.", expression: "2 * (1 * 2 + 1 * 3 + 2 * 3)", answerValue: "22", steps: ["Find the three different face areas: 2, 3, and 6.", "Add them and multiply by 2 for opposite faces.", "2 × (2 + 3 + 6) = 22 square units."] },
    ],
  };
  return examples[id] ?? [
    { problem: `Use ${title} to find 2 + 3.`, expression: "2 + 3", answerValue: "5", steps: ["Identify the operation.", "Combine the quantities.", "The result is 5."] },
    { problem: `Use ${title} to find 3 + 4.`, expression: "3 + 4", answerValue: "7", steps: ["Identify the operation.", "Combine the quantities.", "The result is 7."] },
  ];
}

function makeLesson(subSkillId: string): Lesson {
  const subSkill = ALL_SUBSKILLS.find((item) => item.id === subSkillId)!;
  const realm = getRealm(subSkill.realmId);
  const isFraction = subSkillId.includes("fraction") || subSkillId.includes("fracdiv");
  const visual = isFraction ? "fractionBar" : subSkillId.includes("ratio") ? "ratioTable" : subSkillId.includes("area") || subSkillId.includes("volume") ? "areaGrid" : "numberLine";
  return {
    title: subSkill.title,
    hook: `Imagine using ${subSkill.title.toLowerCase()} to solve a puzzle in ${realm.name}.`,
    bigIdea: `${subSkill.title} helps you describe and solve number relationships. Choose the operation that matches the question, keep track of units, and check that your answer makes sense.`,
    vocabulary: [
      { term: "Expression", definition: "A number sentence that shows the operations in a problem." },
      { term: "Estimate", definition: "A nearby value used to decide whether an answer is reasonable." },
    ],
    workedExamples: examplesFor(subSkillId, subSkill.title),
    commonMistakes: [
      `Using the wrong operation for ${subSkill.title.toLowerCase()}.`,
      "Forgetting to label the answer with the correct units or simplify it when needed.",
    ],
    realWorld: `People use ${subSkill.title.toLowerCase()} when measuring, comparing, planning, and checking quantities in everyday tasks.`,
    scenes: [
      { narration: `Welcome to ${realm.name}. Today we are exploring ${subSkill.title}.`, visual: "text" },
      { narration: `Look for the quantities and relationships described by ${subSkill.title}.`, visual, visualData: visual === "fractionBar" ? { n: 3, d: 4 } : visual === "numberLine" ? { min: 0, max: 1, mark: 0.5 } : visual === "areaGrid" ? { rows: 4, cols: 4, shaded: 8 } : { a: 2, b: 3, mult: 2 } },
      { narration: "Work carefully through each step, then check the result.", visual: "steps" },
      { narration: "You can use this idea in real measurements and comparisons.", visual: "text" },
    ],
    infographic: {
      headline: `${subSkill.title}: the key idea`,
      keyPoints: [
        "Read the quantities and identify what is being asked.",
        "Choose an operation that matches the relationship.",
        "Check the calculation and include units in the answer.",
      ],
      diagram: visual,
    },
  };
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  for (const subSkill of ALL_SUBSKILLS) {
    const lesson = makeLesson(subSkill.id);
    const checked = verifyLesson(lesson);
    if (!checked.ok) throw new Error(`${subSkill.id}: ${checked.reason} ${checked.detail ?? ""}`);
    const full = { ...lesson, realmId: subSkill.realmId, subSkillId: subSkill.id, source: "seed" };
    fs.writeFileSync(path.join(outDir, `${subSkill.realmId}__${subSkill.id}.json`), `${JSON.stringify(full, null, 2)}\n`);
  }
  console.log(`Generated ${ALL_SUBSKILLS.length} seed lessons; all worked examples passed verifyLesson.`);
}

main();

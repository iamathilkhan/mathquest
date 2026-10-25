import "server-only";
import { PROMPT_VERSION } from "@/lib/promptVersion";

export { PROMPT_VERSION };

export function schemaDescriptionFor(typeName: string): string {
  return `A valid JSON object matching this contract:
{
  "type": "${typeName}",
  "properties": {
    "questions": [
      {
        "stem": "string",
        "tier": "easy|medium|hard",
        "expression": "string",
        "options": [
          { "label": "string", "value": "string", "why": "string" }
        ],
        "correctIndex": 0,
        "explanation": "string",
        "hint": "string",
        "subSkillId": "string"
      }
    ]
  }
}`;
}

export const SYSTEM_PROMPT = [
  "You are a careful math question generator for Grade 5 and 6 students.",
  "Follow these rules exactly:",
  "1. Every question must be valid arithmetic, not procedural fiction.",
  "2. Use exact math and do not invent unsupported numbers.",
  "3. The answer must be numeric; options must display the same number they evaluate to.",
  "4. Write numbers in the expression exactly as they appear in the stem.",
  "5. Mixed numbers must be written as (2+1/4) when needed.",
  "6. Use only + - * / ( ) and numbers in expressions; no markdown.",
  "7. No AI-generated math reaches students unless a verifier confirms it.",
].join(" ");

export function questionPrompt(realm: { id: string; grade: number; name: string }, spec: { subSkillIds: string[]; tier: "easy" | "medium" | "hard"; stageIndex: number }, avoid: string[]): string {
  return [
    `Generate a question batch for realm ${realm.id} (${realm.name}) for Grade ${realm.grade}.`,
    `Sub-skill IDs involved: ${spec.subSkillIds.join(", ")}.`,
    `Difficulty tier: ${spec.tier}.`,
    `Stage index: ${spec.stageIndex}.`,
    `Avoid these stems: ${avoid.length ? avoid.join("; ") : "none"}.`,
    `Use context variety: food, sports, games, school, and nature.`,
    `Easy = one step and small whole numbers or like denominators.`,
    `Medium = two steps, unlike denominators, or decimals to hundredths.`,
    `Hard = multi-step word problems with a common error trap.`,
    `Return only compact JSON matching the schema.`,
    `The object shape must be {"questions":[...]} with four numeric options each and a correctIndex field.`,
    `Do not reuse any stem from the avoid list.`,
    `For boss stages, include a mix of mostly the current sub-skill and some earlier ones.`,
    `One short example is: {"stem":"What is 3/4 + 1/2?","tier":"medium","expression":"3/4 + 1/2","options":[{"label":"5/4","value":"5/4","why":"Add numerators with a common denominator"},{"label":"1/4","value":"1/4","why":"Forgot the common denominator"},{"label":"2/3","value":"2/3","why":"Added wrong parts"},{"label":"1","value":"1","why":"Rounded incorrectly"}],"correctIndex":0,"explanation":"Use a common denominator to combine the fractions.","hint":"You can rewrite 1/2 as 2/4.","subSkillId":"${spec.subSkillIds[0] ?? "skill"}"}`,
    `Do not copy the example content.`,
    `Schema: ${schemaDescriptionFor("QuestionBatch")}`,
  ].join(" ");
}

export function lessonPrompt(realm: { id: string; name: string }, subSkillId: string): string {
  return [
    `Generate a lesson for realm ${realm.id} (${realm.name}) for sub-skill ${subSkillId}.`,
    `Create a clear Grade 5 or 6 math lesson with: title, hook, bigIdea, vocabulary, workedExamples, commonMistakes, realWorld, scenes, and infographic.`,
    `Each worked example must include problem, expression, answerValue, and steps.`,
    `Use only numeric arithmetic in the expressions and ensure the value matches the answerValue exactly.`,
    `Each scene has narration and visual with one of: text|fractionBar|numberLine|areaGrid|ratioTable|steps.`,
    `For scenes with visualData use these exact contracts: fractionBar {n,d}; numberLine {min,max,mark}; areaGrid {rows,cols,shaded}; ratioTable {a,b,mult}; text/steps should have no visualData.`,
    `Do not ask for an art prompt.`,
    `Return valid JSON only.`,
    `Use one of the involved sub-skill ids in each question when generating boss-stage content.`,
  ].join(" ");
}

import fs from "node:fs";
import path from "node:path";

import { ENABLED_REALMS, type RealmId } from "@/lib/config";
import { ALL_SUBSKILLS } from "@/data/curriculum";
import { createSeedProvider } from "@/lib/server/seed";

const ROOT = process.cwd();
const lessonsDir = path.join(ROOT, "data", "lessons");
const questionsDir = path.join(ROOT, "data", "seed-questions");

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file: string, value: unknown) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

async function main() {
  ensureDir(lessonsDir);
  ensureDir(questionsDir);

  const seed = createSeedProvider();

  for (const realmId of ENABLED_REALMS as readonly RealmId[]) {
    const subSkills = ALL_SUBSKILLS.filter((s) => s.realmId === realmId);
    for (const skill of subSkills) {
      const lessonFile = path.join(lessonsDir, `${realmId}__${skill.id}.json`);
      const questionFile = path.join(questionsDir, `${realmId}__${skill.id}.json`);

      if (!fs.existsSync(lessonFile)) {
        const lesson = seed.lessonFor(realmId, skill.id) ?? {
          title: `${realmId} - ${skill.title}`,
          hook: "Learn the skill with a clear worked example.",
          bigIdea: "Follow the steps carefully and verify every result.",
          vocabulary: [{ term: "Step", definition: "A smaller action in the solution." }],
          workedExamples: [
            {
              problem: "What is 1/2 + 1/2?",
              expression: "1/2 + 1/2",
              answerValue: "1",
              steps: ["Add numerators", "Keep denominator", "Simplify to 1"],
            },
            {
              problem: "What is 3 × 1/4?",
              expression: "3 * (1/4)",
              answerValue: "3/4",
              steps: ["Multiply the numerator by 3", "Keep the denominator", "Simplify the result"],
            },
          ],
          commonMistakes: ["Forgetting to keep the denominator the same.", "Making a careless arithmetic mistake."],
          realWorld: "This idea helps when sharing food, measuring ingredients, and checking totals.",
          scenes: [
            { narration: "Use the key idea first.", visual: "text" },
            { narration: "Model the numbers on a visual diagram.", visual: "fractionBar" },
            { narration: "Work through the calculation step by step.", visual: "steps" },
            { narration: "Check the answer in context.", visual: "numberLine" },
          ],
          infographic: {
            headline: "Key idea",
            keyPoints: ["Keep the denominator when it matches.", "Check the arithmetic twice.", "Verify the final value."],
            diagram: "fractionBar",
          },
        };
        writeJson(lessonFile, { ...lesson, realmId, subSkillId: skill.id, source: "seed", generatedAt: Date.now() });
      }

      if (!fs.existsSync(questionFile)) {
        const seedQuestions = seed.questionsFor([skill.id], "easy", []);
        const items = seedQuestions.length ? seedQuestions.slice(0, 6) : [];
        writeJson(questionFile, { items, realmId, subSkillId: skill.id, source: "seed", generatedAt: Date.now() });
      }
    }
  }

  console.log("Seed bank generation complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

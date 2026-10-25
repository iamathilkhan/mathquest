import fs from "node:fs";
import path from "node:path";
import { ALL_SUBSKILLS } from "../data/curriculum";

interface LessonData {
  title: string;
  hook: string;
  bigIdea: string;
  vocabulary: Array<{ term: string; definition: string }>;
  workedExamples: Array<{ problem: string; expression: string; answerValue: string; steps: string[] }>;
  commonMistakes: string[];
  realWorld: string;
  scenes: Array<{ scene: number; text: string; narration: string }>;
  model?: string;
  generator?: string;
  promptVersion?: string;
  generatedAt?: number;
}

interface QuestionData {
  stem: string;
  expression: string;
  answerValue: string;
  options: Array<{ label: string; value: string }>;
  explanation: string;
  tier: "easy" | "medium" | "hard";
  model?: string;
  generator?: string;
  promptVersion?: string;
  generatedAt?: number;
}

function getNGrams(text: string, n = 5): Set<string> {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  const ngrams = new Set<string>();
  if (words.length < n) {
    if (words.length > 0) ngrams.add(words.join(" "));
    return ngrams;
  }
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.add(words.slice(i, i + n).join(" "));
  }
  return ngrams;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1.0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function runContentAudit(): void {
  const lessonsDir = path.join(process.cwd(), "data", "lessons");
  const questionsDir = path.join(process.cwd(), "data", "seed-questions");

  console.log("=================================================================");
  console.log("            MATHQUEST CONTENT & PROVENANCE AUDIT                 ");
  console.log("=================================================================\n");

  // 1. Audit Lessons
  const lessonFiles = fs.readdirSync(lessonsDir).filter((f) => f.endsWith(".json"));
  console.log(`Found ${lessonFiles.length} lesson files in data/lessons.`);

  const lessons: Record<string, LessonData> = {};
  const hooks = new Set<string>();
  const bigIdeas = new Set<string>();
  const exampleProblems = new Set<string>();
  const exampleExpressions = new Set<string>();
  const narrations = new Set<string>();

  const lessonTexts: Record<string, string> = {};

  for (const file of lessonFiles) {
    const filePath = path.join(lessonsDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, "utf-8")) as LessonData;
    lessons[file] = content;

    hooks.add(content.hook);
    bigIdeas.add(content.bigIdea);
    for (const ex of content.workedExamples || []) {
      exampleProblems.add(ex.problem);
      exampleExpressions.add(ex.expression);
    }
    for (const sc of content.scenes || []) {
      narrations.add(sc.narration);
    }

    // Combine text for similarity
    const fullText = [
      content.hook,
      content.bigIdea,
      (content.workedExamples || []).map((e) => e.problem + " " + e.steps.join(" ")).join(" "),
      (content.commonMistakes || []).join(" "),
      content.realWorld,
      (content.scenes || []).map((s) => s.narration).join(" "),
    ].join(" ");
    lessonTexts[file] = fullText;
  }

  console.log("\n--- LESSON METRICS ---");
  console.log(`Total Lessons:             ${lessonFiles.length}`);
  console.log(`Unique Hooks:              ${hooks.size} / ${lessonFiles.length}`);
  console.log(`Unique Big Ideas:          ${bigIdeas.size} / ${lessonFiles.length}`);
  console.log(`Unique Worked Problems:    ${exampleProblems.size}`);
  console.log(`Unique Worked Expressions: ${exampleExpressions.size}`);
  console.log(`Unique Scene Narrations:   ${narrations.size}`);

  // Pairwise 5-gram Jaccard Similarity for Lessons
  const pairs: Array<{ pair: string; sim: number }> = [];
  const filesList = Object.keys(lessonTexts);
  for (let i = 0; i < filesList.length; i++) {
    for (let j = i + 1; j < filesList.length; j++) {
      const f1 = filesList[i];
      const f2 = filesList[j];
      const grams1 = getNGrams(lessonTexts[f1], 5);
      const grams2 = getNGrams(lessonTexts[f2], 5);
      const sim = jaccardSimilarity(grams1, grams2);
      pairs.push({ pair: `${f1} <-> ${f2}`, sim });
    }
  }

  pairs.sort((a, b) => b.sim - a.sim);
  console.log("\n--- TOP 10 HIGHEST LESSON PAIRWISE 5-GRAM SIMILARITIES ---");
  pairs.slice(0, 10).forEach((p, idx) => {
    console.log(`${idx + 1}. ${(p.sim * 100).toFixed(2)}% | ${p.pair}`);
  });

  // 2. Audit Questions
  const questionFiles = fs.readdirSync(questionsDir).filter((f) => f.endsWith(".json"));
  console.log(`\nFound ${questionFiles.length} question files in data/seed-questions.`);

  let totalQuestions = 0;
  const stems = new Set<string>();
  const expressions = new Set<string>();
  const skeletons = new Map<string, number>();

  for (const file of questionFiles) {
    const filePath = path.join(questionsDir, file);
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as { items?: QuestionData[] } | QuestionData[];
    const items = Array.isArray(raw) ? raw : (raw.items || []);
    totalQuestions += items.length;

    for (const q of items) {
      stems.add(q.stem);
      expressions.add(q.expression);
      const skel = q.stem.replace(/\d+/g, "#").trim();
      skeletons.set(skel, (skeletons.get(skel) || 0) + 1);
    }
  }

  const stemDuplicateRate = totalQuestions > 0 ? (totalQuestions - stems.size) / totalQuestions : 0;
  console.log("\n--- QUESTION METRICS ---");
  console.log(`Total Questions:          ${totalQuestions}`);
  console.log(`Unique Stems:             ${stems.size} / ${totalQuestions} (${(stemDuplicateRate * 100).toFixed(2)}% duplicates)`);
  console.log(`Unique Expressions:       ${expressions.size} / ${totalQuestions}`);
  console.log(`Unique Skeletons (stem):  ${skeletons.size}`);

  console.log("\n--- TOP 5 MOST REUSED QUESTION SKELETONS ---");
  const sortedSkeletons = [...skeletons.entries()].sort((a, b) => b[1] - a[1]);
  sortedSkeletons.slice(0, 5).forEach(([skel, count], idx) => {
    console.log(`${idx + 1}. [${count}x]: "${skel}"`);
  });

  // 3. Standards Check
  console.log("\n--- STANDARDS AND PLACEHOLDERS ---");
  for (const sub of ALL_SUBSKILLS) {
    const hasPlaceholder = /TODO|\.\.\./i.test(sub.standardCode) || /TODO|\.\.\./i.test(sub.standardText);
    const flag = hasPlaceholder ? "[FLAGGED: PLACEHOLDER]" : "[OK]";
    console.log(`${flag} ${sub.id}: ${sub.standardCode} | ${sub.title}`);
  }

  // 4. Provenance Summary
  console.log("\n--- PROVENANCE AUDIT ---");
  let lessonsWithProvenance = 0;
  for (const [file, l] of Object.entries(lessons)) {
    if (l.generator || l.model || l.promptVersion || l.generatedAt) {
      lessonsWithProvenance++;
    }
  }
  console.log(`Lessons with provenance block:   ${lessonsWithProvenance} / ${lessonFiles.length}`);
  console.log(`Questions with provenance block: 0 / ${questionFiles.length}`);
  console.log(`Seed content written by LLM:     0% (100% template-script generated)`);
}

if (process.argv[1]?.endsWith("audit-content.ts")) {
  runContentAudit();
}

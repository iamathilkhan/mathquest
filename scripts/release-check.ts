import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn, spawnSync } from "node:child_process";

import { ALL_SUBSKILLS } from "@/data/curriculum";
import { ENABLED_REALMS } from "@/lib/config";
import { verifyLesson } from "@/lib/verify/lesson";
import { verifyQuestion } from "@/lib/verify/question";
import { LessonSchema, RawQuestionSchema } from "@/lib/schemas";

const root = process.cwd();
type Row = { item: number; result: "PASS" | "FAIL" | "WARN"; detail: string };
const rows: Row[] = [];
const add = (item: number, result: Row["result"], detail: string) => rows.push({ item, result, detail });
const readJson = (file: string): unknown => JSON.parse(fs.readFileSync(file, "utf8"));
const trackedFiles = (): string[] => execFileSync("git", ["ls-files", "-z"], { cwd: root }).toString().split("\0").filter(Boolean);
const gitFiles = (() => { try { return trackedFiles(); } catch { return []; } })();

function checkCurriculum() {
  const text = fs.readFileSync(path.join(root, "data/curriculum.ts"), "utf8");
  return !text.includes("TODO_VERIFY");
}

function checkEnvFiles() {
  const bad = gitFiles.filter((file) => /^\.env(?!\.example$)/.test(file));
  return bad;
}

function secretScan() {
  const candidate = /(AIza[0-9A-Za-z_-]{30,}|GEMINI_API_KEY\s*[=:]\s*['"]?[A-Za-z0-9_-]{20,})/;
  const matches: string[] = [];
  for (const file of gitFiles) {
    if (!/\.(ts|tsx|js|jsx|json|md|yml|yaml|env|txt)$/.test(file) || file.endsWith(".lock")) continue;
    try {
      if (candidate.test(fs.readFileSync(path.join(root, file), "utf8"))) matches.push(file);
    } catch { /* deleted tracked paths do not apply */ }
  }
  let historyClean = false;
  try {
    const history = execFileSync("git", ["log", "--all", "-p", "--", ...gitFiles], { cwd: root, maxBuffer: 20 * 1024 * 1024 }).toString();
    historyClean = !candidate.test(history);
  } catch {
    historyClean = false;
  }
  return { matches, historyClean };
}

function run(command: string, args: readonly string[]) {
  return spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, STRICT_STANDARDS: "1" },
    shell: process.platform === "win32",
  });
}

function trackedPattern(pattern: RegExp): string[] {
  return gitFiles.filter((file) => pattern.test(file));
}

async function production404(): Promise<boolean> {
  const port = "3189";
  const server = spawn("npm", ["run", "start", "--", "--port", port], {
    cwd: root,
    stdio: "ignore",
    env: { ...process.env, PORT: port },
    shell: process.platform === "win32",
  });
  try {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (server.exitCode !== null) return false;
      try {
        const response = await fetch(`http://127.0.0.1:${port}/dev/kit`);
        return response.status === 404;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    return false;
  } finally {
    server.kill();
  }
}

function checkSeeds() {
  const questionsDir = path.join(root, "data/seed-questions");
  const lessonsDir = path.join(root, "data/lessons");
  const errors: string[] = [];
  let lessons = 0;
  let questionsCount = 0;
  for (const skill of ALL_SUBSKILLS) {
    const qPath = path.join(questionsDir, `${skill.realmId}__${skill.id}.json`);
    const lPath = path.join(lessonsDir, `${skill.realmId}__${skill.id}.json`);
    if (!fs.existsSync(qPath)) { errors.push(`missing questions ${skill.id}`); continue; }
    if (!fs.existsSync(lPath)) { errors.push(`missing lesson ${skill.id}`); continue; }
    const questionPayload = readJson(qPath) as { items?: unknown[] };
    const lessonPayload = readJson(lPath) as { lesson?: unknown } & Record<string, unknown>;
    const lesson = LessonSchema.safeParse(lessonPayload.lesson ?? lessonPayload);
    if (!lesson.success) errors.push(`invalid lesson schema ${skill.id}`);
    else {
      const checkedLesson = verifyLesson(lesson.data);
      if (!checkedLesson.ok) errors.push(`lesson verifier ${skill.id}: ${checkedLesson.reason}`);
      lessons += 1;
    }
    const items = questionPayload.items ?? [];
    const tiers = { easy: 0, medium: 0, hard: 0 };
    for (const item of items) {
      const parsed = RawQuestionSchema.safeParse(item);
      if (!parsed.success) { errors.push(`invalid question schema ${skill.id}`); continue; }
      const verified = verifyQuestion(parsed.data);
      if (!verified.ok) errors.push(`question verifier ${skill.id}: ${verified.reason}`);
      else {
        tiers[verified.q.tier] += 1;
        questionsCount += 1;
      }
    }
    for (const tier of ["easy", "medium", "hard"] as const) {
      if (tiers[tier] < 6) errors.push(`${skill.id} has ${tiers[tier]} ${tier} questions`);
    }
  }
  return { errors, lessons, questionsCount };
}

async function runChecks() {
  add(1, checkCurriculum() ? "PASS" : "FAIL", checkCurriculum() ? "No TODO_VERIFY in curriculum." : "TODO_VERIFY remains; official standards mapping is not complete.");

  const envFiles = checkEnvFiles();
  const envExample = trackedPattern(/^\.env\.example$/).length === 1;
  add(2, envFiles.length === 0 && envExample ? "PASS" : "FAIL", envFiles.length ? `Tracked forbidden env files: ${envFiles.join(", ")}` : envExample ? "Only .env.example is tracked." : ".env.example is missing from tracked files.");

  const secret = secretScan();
  add(3, secret.matches.length === 0 && secret.historyClean ? "PASS" : "FAIL", secret.matches.length ? `Secret-like pattern in: ${secret.matches.join(", ")}` : secret.historyClean ? "Tracked files and available git history scanned; no Google key pattern found." : "Working tree scan clean, but git history scan was unavailable or failed.");

  const checks = [
    ["typecheck", "npm", ["run", "typecheck"]],
    ["lint", "npm", ["run", "lint"]],
    ["tests", "npm", ["test"]],
    ["build", "npm", ["run", "build"]],
  ] as const;
  for (const [label, cmd, args] of checks) {
    const result = run(cmd, args);
    add(4, result.status === 0 ? "PASS" : "FAIL", `${label}: exit ${result.status ?? "unknown"} (STRICT_STANDARDS=1)`);
  }

  const staticDir = path.join(root, ".next", "static");
  let leak = false;
  if (fs.existsSync(staticDir)) {
    const queue = [staticDir];
    while (queue.length) {
      const current = queue.pop()!;
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) queue.push(full);
        else if (/\.(js|css|map|html|json)$/.test(entry.name)) {
          const content = fs.readFileSync(full, "utf8");
          if (/mathjs|\bGEMINI(?:_API_KEY|_MODEL_(?:PRIMARY|FALLBACK))\b|AIza[0-9A-Za-z_-]{20,}|(?:from\s+["']sharp["']|require\(["']sharp["']\))/.test(content)) leak = true;
        }
      }
    }
  }
  add(5, !leak && fs.existsSync(staticDir) ? "PASS" : "FAIL", leak ? "Sensitive/server-only dependency marker found in .next/static." : fs.existsSync(staticDir) ? "No forbidden dependency/key strings in .next/static." : "Build output .next/static is missing.");

  const seed = checkSeeds();
  add(6, seed.errors.length ? "FAIL" : "PASS", seed.errors.length ? seed.errors.slice(0, 8).join("; ") : `${seed.lessons} lessons and ${seed.questionsCount} verifier-approved questions; >=6 per tier for all 18 sub-skills.`);

  const artDir = path.join(root, "public", "art");
  const artFiles = fs.existsSync(artDir) ? fs.readdirSync(artDir, { recursive: true }).filter((file) => typeof file === "string") as string[] : [];
  const artBytes = artFiles.reduce((total, file) => total + fs.statSync(path.join(artDir, file)).size, 0);
  const expectedArtPaths = ["landing", "grade-5", "grade-6", "world-map", "library", ...ENABLED_REALMS.map((realmId) => `realm-${realmId}`), "hero-full", "hero-portrait", "mentor-full", "mentor-portrait", ...ENABLED_REALMS.map((realmId) => `minion-${realmId}`), ...ENABLED_REALMS.map((realmId) => `boss-${realmId}`), ...ENABLED_REALMS.map((realmId) => `plate-${realmId}`)];
  const missingArt = expectedArtPaths.filter((slot) => !artFiles.some((file) => file.startsWith(slot)));
  const assetsOkay = missingArt.length === 0 && artBytes < 8 * 1024 * 1024;
  add(7, assetsOkay ? "PASS" : "FAIL", `${artFiles.length} files / ${(artBytes / 1024 / 1024).toFixed(2)} MB; ${missingArt.length} expected slots missing${missingArt.length ? ` (e.g. ${missingArt.slice(0, 5).join(", ")})` : ""}.`);

  const devKit404 = await production404();
  add(8, devKit404 ? "PASS" : "FAIL", devKit404 ? "Production server returns 404 for /dev/kit." : "Could not confirm a production 404 for /dev/kit.");

  const fixtureImports = gitFiles.filter((file) => /\.(ts|tsx)$/.test(file)).filter((file) => {
    if (/^(app\/dev\/|.*\.test\.)/.test(file)) return false;
    try { return /(?:from\s+["'][^"']*fixtures|import\s*\(\s*["'][^"']*fixtures)/.test(fs.readFileSync(path.join(root, file), "utf8")); } catch { return false; }
  });
  add(9, fixtureImports.length ? "FAIL" : "PASS", fixtureImports.length ? `Fixture imports outside tests/dev: ${fixtureImports.join(", ")}` : "No fixture imports found outside tests/dev.");

  let evalOld = false;
  try {
    const evalTime = fs.statSync(path.join(root, "docs/EVAL.md")).mtimeMs;
    const promptTime = fs.statSync(path.join(root, "lib/llm/prompts.ts")).mtimeMs;
    evalOld = evalTime < promptTime;
  } catch {
    evalOld = true;
  }
  add(10, evalOld ? "WARN" : "PASS", evalOld ? "docs/EVAL.md is missing or older than the prompt definitions; refresh measured reliability." : "Evaluation report is current relative to prompt definitions.");
}

void runChecks().then(() => {
  console.log("\nPhase 4 release check");
  console.table(rows);
  if (rows.some((row) => row.result === "FAIL")) process.exitCode = 1;
});

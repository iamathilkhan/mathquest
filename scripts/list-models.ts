import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";

function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (key && rest.length > 0) {
        process.env[key.trim()] = rest.join("=").trim();
      }
    }
  }
}

async function listModels() {
  loadEnvLocal();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    console.error("FAIL: GEMINI_API_KEY is not set in environment or .env.local.");
    console.error("Please add GEMINI_API_KEY to .env.local before running this command.");
    process.exit(1);
  }

  console.log("Querying Gemini API for available models...");

  try {
    const ai = new GoogleGenAI({ apiKey });
    const pager = await ai.models.list();
    const modelNames: string[] = [];

    for await (const model of pager) {
      if (model.name) {
        // Model names are typically formatted like "models/gemini-2.5-flash"
        const cleanName = model.name.replace(/^models\//, "");
        modelNames.push(cleanName);
      }
    }

    console.log(`\nFound ${modelNames.length} models available to this key:`);
    const textModels = modelNames.filter((m) => m.includes("gemini") || m.includes("flash"));
    for (const m of textModels) {
      console.log(`  - ${m}`);
    }
  } catch (err: unknown) {
    console.error("FAIL: Failed to fetch models list:");
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

void listModels();

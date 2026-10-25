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

async function smokeTest() {
  loadEnvLocal();

  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  const primaryModel = process.env.GEMINI_MODEL_PRIMARY || "(not set)";
  const fallbackModel = process.env.GEMINI_MODEL_FALLBACK || "(not set)";

  console.log("=== Gemini Smoke Test ===");
  console.log(`GEMINI_API_KEY present: ${hasKey}`);
  console.log(`GEMINI_MODEL_PRIMARY:   ${primaryModel}`);
  console.log(`GEMINI_MODEL_FALLBACK:  ${fallbackModel}`);

  if (!hasKey) {
    console.error("FAIL: GEMINI_API_KEY is not set in environment or .env.local.");
    process.exit(1);
  }

  const model = process.env.GEMINI_MODEL_PRIMARY || "gemini-2.5-flash";
  console.log(`Testing connection with model '${model}'...`);

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const response = await ai.models.generateContent({
      model,
      contents: "Respond with the word 'OK' only.",
    });
    console.log(`SUCCESS: Received response: ${response.text?.trim()}`);
  } catch (err: unknown) {
    console.error(`FAIL: API call failed with error:`);
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

void smokeTest();

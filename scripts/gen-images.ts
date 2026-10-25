/**
 * scripts/gen-images.ts
 *
 * Fetches raw AI pixel-art from the free Pollinations image service into art-src/
 * (git-ignored). Run `npm run art:process` afterwards to process those raw files into
 * committed public/art/ assets. The runtime app NEVER calls this endpoint — only this
 * offline script does.
 *
 * Pollinations endpoint (free, no key):
 *   https://image.pollinations.ai/prompt/{encoded prompt}?width=480&height=320&nologo=true
 *
 * We space requests >= 16 s to stay within the free tier's courtesy limits, retry once
 * on failure, and skip any slot whose raw file already exists so the script is resumable.
 *
 * NOTE: this script is the "real AI art" path. The current committed art was produced by
 * scripts/art-process.ts as deterministic placeholders because Pollinations was
 * unavailable during development. See docs/ART_CREDITS.md.
 *
 * Run: npm run art:gen
 */
import fs from "node:fs";
import path from "node:path";

import { ENABLED_REALMS, type RealmId } from "../lib/config";

const WIDTH = 480;
const HEIGHT = 320;
const MIN_DELAY_MS = 16_000;
const REQUEST_TIMEOUT_MS = 90_000;

interface RealmMeta {
  name: string;
  theme: string;
  scene: string;
  boss: string;
  concept: string;
}

const REALMS: Record<RealmId, RealmMeta> = {
  "g5-fractions": { name: "Fraction Forest", theme: "forest", scene: "mystical forest with glowing fraction symbols", boss: "Fraction Warden", concept: "fractions divided into parts" },
  "g5-decimals": { name: "Decimal Dunes", theme: "dunes", scene: "endless desert dunes under a dusk sky", boss: "Decimal Djinn", concept: "decimal place value columns" },
  "g5-volume": { name: "Volume Volcano", theme: "volcano", scene: "erupting volcano with cubes of unit volume", boss: "Magma Golem", concept: "3D rectangular prism volume" },
  "g6-ratios": { name: "Ratio Reef", theme: "reef", scene: "underwater coral reef with ratio comparisons", boss: "Ratio Kraken", concept: "ratio of two quantities" },
  "g6-fracdiv": { name: "Quotient Quarry", theme: "quarry", scene: "rock quarry with carved fraction divisions", boss: "Quotient Colossus", concept: "dividing fractions" },
  "g6-area": { name: "Area Atoll", theme: "atoll", scene: "tropical island atoll with geometric shapes", boss: "Area Sentinel", concept: "area of triangles and polygons" },
};

const STYLE = "16-bit pixel art, dark fantasy RPG, limited palette, crisp pixels, no text, no watermark, no letters";

function promptFor(slot: string): string {
  if (slot === "landing") return `${STYLE}, title screen fantasy landscape at dusk with a glowing gate and a gold moon`;
  if (slot === "grade-5") return `${STYLE}, a verdant forest realm overview`;
  if (slot === "grade-6") return `${STYLE}, a tropical island atoll realm overview`;
  if (slot === "world-map") return `${STYLE}, top-down world map with six regions and a dotted path between them`;
  if (slot === "library") return `${STYLE}, cozy wizard library interior with bookshelves and a glowing tome`;
  if (slot.startsWith("realm-")) return realmPrompt(slot.slice(6) as RealmId, "scene");
  if (slot === "hero-full") return `${STYLE}, full body heroic pixel knight with sword, plain transparent background`;
  if (slot === "hero-portrait") return `${STYLE}, close up portrait of a heroic pixel knight, dark background`;
  if (slot === "mentor-full") return `${STYLE}, full body old wizard mentor with pointy hat and staff, plain transparent background`;
  if (slot === "mentor-portrait") return `${STYLE}, close up portrait of an old wizard mentor, dark background`;
  if (slot.startsWith("minion-")) return realmPrompt(slot.slice(7) as RealmId, "minion");
  if (slot.startsWith("boss-")) return realmPrompt(slot.slice(5) as RealmId, "boss");
  if (slot.startsWith("plate-")) return realmPrompt(slot.slice(6) as RealmId, "plate");
  return STYLE;
}

function realmPrompt(id: RealmId, kind: "scene" | "minion" | "boss" | "plate"): string {
  const meta = REALMS[id];
  if (kind === "scene") return `${STYLE}, ${meta.scene}`;
  if (kind === "minion") return `${STYLE}, small ${meta.theme} themed minion creature, full body, plain transparent background`;
  if (kind === "boss") return `${STYLE}, large intimidating ${meta.boss} boss creature, ${meta.theme} themed, full body, plain transparent background`;
  return `${STYLE}, educational infographic illustration of ${meta.concept}, ${meta.theme} themed`;
}

function allSlots(): string[] {
  const slots: string[] = ["landing", "grade-5", "grade-6", "world-map", "library"];
  for (const id of ENABLED_REALMS) slots.push(`realm-${id}`);
  slots.push("hero-full", "hero-portrait", "mentor-full", "mentor-portrait");
  for (const id of ENABLED_REALMS) slots.push(`minion-${id}`);
  for (const id of ENABLED_REALMS) slots.push(`boss-${id}`);
  for (const id of ENABLED_REALMS) slots.push(`plate-${id}`);
  return slots;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function fetchOnce(url: string): Promise<Buffer | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (response.ok && response.body) {
        const array = Buffer.from(await response.arrayBuffer());
        // Pollinations sometimes returns a 200 with an error page; guard with a PNG signature check.
        if (array.length > 256 && array[0] === 0x89 && array[1] === 0x50) return array;
      }
      console.warn(`  attempt ${attempt + 1} failed (status ${response.status})`);
    } catch (error) {
      console.warn(`  attempt ${attempt + 1} error: ${(error as Error).message}`);
    } finally {
      clearTimeout(timer);
    }
    await wait(2000);
  }
  return null;
}

async function main(): Promise<void> {
  const artSrc = path.join(process.cwd(), "art-src");
  fs.mkdirSync(artSrc, { recursive: true });
  const slots = allSlots();
  let ok = 0;
  let skipped = 0;
  let failed = 0;
  for (const slot of slots) {
    const out = path.join(artSrc, `${slot}.png`);
    if (fs.existsSync(out)) {
      skipped += 1;
      console.log(`${slot} (exists)`);
      continue;
    }
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptFor(slot))}?width=${WIDTH}&height=${HEIGHT}&nologo=true`;
    process.stdout.write(`${slot} ... `);
    const buf = await fetchOnce(url);
    if (buf) {
      fs.writeFileSync(out, buf);
      ok += 1;
      console.log(`ok (${(buf.length / 1024).toFixed(1)} KB)`);
    } else {
      failed += 1;
      console.log("FAILED (will be placeholder in art:process)");
    }
    if (slot !== slots[slots.length - 1]) await wait(MIN_DELAY_MS);
  }
  console.log(`\n${ok} fetched, ${skipped} existing, ${failed} failed. Run 'npm run art:process' to commit processed art.`);
  if (failed > 0 && ok === 0) {
    console.warn("Pollinations appears unavailable. public/art/ will use the deterministic placeholders.");
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/**
 * scripts/diagnose-art.ts
 *
 * Diagnoses art asset availability: for every slot in data/artManifest.ts,
 * prints slot id, expected path, file existence, byte size, image dimensions,
 * and filename case-sensitivity match.
 *
 * Run: npm run diagnose:art
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

import { ART_MANIFEST } from "@/data/artManifest";

async function main(): Promise<void> {
  const root = process.cwd();
  console.log("\n┌─ Art Manifest Diagnostic ─────────────────────────────────────┐\n");
  console.log("Slot                       | Path                    | Exists | Bytes | Dims (W×H) | Case OK");
  console.log("─".repeat(90));

  for (const [slot, entry] of Object.entries(ART_MANIFEST)) {
    const fullPath = path.join(root, "public", entry.path.slice(1)); // remove leading /
    const exists = fs.existsSync(fullPath);
    let bytes = 0;
    let dims = "—";
    let caseOk = "—";

    if (exists) {
      const stat = fs.statSync(fullPath);
      bytes = stat.size;

      // Check filename case sensitivity (Windows is case-insensitive by default, but git is case-sensitive)
      const dir = path.dirname(fullPath);
      const files = fs.readdirSync(dir);
      const filename = path.basename(fullPath);
      caseOk = files.includes(filename) ? "✓" : "✗";

      // Get image dimensions
      try {
        const metadata = await sharp(fullPath).metadata();
        if (metadata.width && metadata.height) {
          dims = `${metadata.width}×${metadata.height}`;
        }
      } catch {
        dims = "ERROR";
      }
    }

    const slotLabel = slot.padEnd(26);
    const pathLabel = entry.path.padEnd(23);
    const existsLabel = (exists ? "✓" : "✗").padEnd(7);
    const bytesLabel = `${bytes}`.padEnd(6);
    const dimsLabel = dims.padEnd(10);

    console.log(`${slotLabel} | ${pathLabel} | ${existsLabel} | ${bytesLabel} | ${dimsLabel} | ${caseOk}`);
  }

  console.log("\n" + "─".repeat(90));
  const totalSlots = Object.keys(ART_MANIFEST).length;
  const existingSlots = Object.entries(ART_MANIFEST).filter(([, entry]) => {
    const fullPath = path.join(root, "public", entry.path.slice(1));
    return fs.existsSync(fullPath);
  }).length;
  console.log(`\nTotal: ${existingSlots}/${totalSlots} slots present\n`);

  if (existingSlots < totalSlots) {
    console.log(`⚠ ${totalSlots - existingSlots} slots missing. Check:
  1. public/art/ directory exists and has .png files
  2. Run 'npm run art:process' to generate them
  3. Filenames are exact (case-sensitive on git)\n`);
  }
}

void main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

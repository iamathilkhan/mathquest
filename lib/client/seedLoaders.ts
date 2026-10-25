import { VerifiedQuestionSchema, type VerifiedQuestion } from "@/lib/schemas";
export type SeedLoader = () => Promise<VerifiedQuestion[]>;

async function load(items: Promise<{ default: unknown }>): Promise<VerifiedQuestion[]> {
  try {
    const mod = await items;
    const data = mod.default;
    const payload = Array.isArray(data)
      ? data
      : data && typeof data === "object" && "items" in data && Array.isArray(data.items)
        ? data.items
        : [];
    return payload.flatMap((item) => {
      const parsed = VerifiedQuestionSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

export const seedLoaders: Readonly<Record<string, SeedLoader>> = Object.freeze({
  "g5-fractions-add-sub": () => load(import("@/data/seed-questions/g5-fractions__g5-fractions-add-sub.json")),
  "g5-fractions-multiply": () => load(import("@/data/seed-questions/g5-fractions__g5-fractions-multiply.json")),
  "g5-fractions-divide": () => load(import("@/data/seed-questions/g5-fractions__g5-fractions-divide.json")),
  "g5-decimals-place-value": () => load(import("@/data/seed-questions/g5-decimals__g5-decimals-place-value.json")),
  "g5-decimals-ops": () => load(import("@/data/seed-questions/g5-decimals__g5-decimals-ops.json")),
  "g5-decimals-powers": () => load(import("@/data/seed-questions/g5-decimals__g5-decimals-powers.json")),
  "g5-volume-unit": () => load(import("@/data/seed-questions/g5-volume__g5-volume-unit.json")),
  "g5-volume-formula": () => load(import("@/data/seed-questions/g5-volume__g5-volume-formula.json")),
  "g5-volume-compose": () => load(import("@/data/seed-questions/g5-volume__g5-volume-compose.json")),
  "g6-ratios-concept": () => load(import("@/data/seed-questions/g6-ratios__g6-ratios-concept.json")),
  "g6-ratios-unit-rate": () => load(import("@/data/seed-questions/g6-ratios__g6-ratios-unit-rate.json")),
  "g6-ratios-percent": () => load(import("@/data/seed-questions/g6-ratios__g6-ratios-percent.json")),
  "g6-fracdiv-meaning": () => load(import("@/data/seed-questions/g6-fracdiv__g6-fracdiv-meaning.json")),
  "g6-fracdiv-compute": () => load(import("@/data/seed-questions/g6-fracdiv__g6-fracdiv-compute.json")),
  "g6-fracdiv-word": () => load(import("@/data/seed-questions/g6-fracdiv__g6-fracdiv-word.json")),
  "g6-area-polygons": () => load(import("@/data/seed-questions/g6-area__g6-area-polygons.json")),
  "g6-area-composite": () => load(import("@/data/seed-questions/g6-area__g6-area-composite.json")),
  "g6-area-surface": () => load(import("@/data/seed-questions/g6-area__g6-area-surface.json")),
});

export function getSeedLoaderForSubSkill(subSkillId: string): SeedLoader | undefined {
  return seedLoaders[subSkillId];
}

export default seedLoaders;

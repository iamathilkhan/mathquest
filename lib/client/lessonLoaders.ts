import { LessonSchema, type Lesson } from "@/lib/schemas";

export type LessonLoader = () => Promise<Lesson | null>;

async function load(modulePromise: Promise<{ default: unknown }>): Promise<Lesson | null> {
  try {
    const imported = await modulePromise;
    const payload = imported.default;
    const lesson = payload && typeof payload === "object" && "lesson" in payload ? payload.lesson : payload;
    const parsed = LessonSchema.safeParse(lesson);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const lessonLoaders: Readonly<Record<string, LessonLoader>> = Object.freeze({
  "g5-fractions-add-sub": () => load(import("@/data/lessons/g5-fractions__g5-fractions-add-sub.json")),
  "g5-fractions-multiply": () => load(import("@/data/lessons/g5-fractions__g5-fractions-multiply.json")),
  "g5-fractions-divide": () => load(import("@/data/lessons/g5-fractions__g5-fractions-divide.json")),
  "g5-decimals-place-value": () => load(import("@/data/lessons/g5-decimals__g5-decimals-place-value.json")),
  "g5-decimals-ops": () => load(import("@/data/lessons/g5-decimals__g5-decimals-ops.json")),
  "g5-decimals-powers": () => load(import("@/data/lessons/g5-decimals__g5-decimals-powers.json")),
  "g5-volume-unit": () => load(import("@/data/lessons/g5-volume__g5-volume-unit.json")),
  "g5-volume-formula": () => load(import("@/data/lessons/g5-volume__g5-volume-formula.json")),
  "g5-volume-compose": () => load(import("@/data/lessons/g5-volume__g5-volume-compose.json")),
  "g6-ratios-concept": () => load(import("@/data/lessons/g6-ratios__g6-ratios-concept.json")),
  "g6-ratios-unit-rate": () => load(import("@/data/lessons/g6-ratios__g6-ratios-unit-rate.json")),
  "g6-ratios-percent": () => load(import("@/data/lessons/g6-ratios__g6-ratios-percent.json")),
  "g6-fracdiv-meaning": () => load(import("@/data/lessons/g6-fracdiv__g6-fracdiv-meaning.json")),
  "g6-fracdiv-compute": () => load(import("@/data/lessons/g6-fracdiv__g6-fracdiv-compute.json")),
  "g6-fracdiv-word": () => load(import("@/data/lessons/g6-fracdiv__g6-fracdiv-word.json")),
  "g6-area-polygons": () => load(import("@/data/lessons/g6-area__g6-area-polygons.json")),
  "g6-area-composite": () => load(import("@/data/lessons/g6-area__g6-area-composite.json")),
  "g6-area-surface": () => load(import("@/data/lessons/g6-area__g6-area-surface.json")),
});

export function getLessonLoader(subSkillId: string): LessonLoader | undefined {
  return lessonLoaders[subSkillId];
}

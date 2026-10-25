import { ENABLED_REALMS, type RealmId } from "@/lib/config";

export type SceneArtSlot = "landing" | "grade-5" | "grade-6" | "world-map" | "library" | `realm-${RealmId}`;
export type CharacterArtSlot = "hero-full" | "hero-portrait" | "mentor-full" | "mentor-portrait" | `minion-${RealmId}` | `boss-${RealmId}`;
export type PlateArtSlot = `plate-${RealmId}`;
export type ArtSlot = SceneArtSlot | CharacterArtSlot | PlateArtSlot;

export interface ArtManifestEntry {
  path: string;
  category: "scene" | "character" | "plate";
  alt: string;
  fallbackLabel: string;
}

const entry = (slot: string, category: ArtManifestEntry["category"], alt: string): ArtManifestEntry => ({
  path: `/art/${slot}.png`,
  category,
  alt,
  fallbackLabel: `${alt} art unavailable`,
});

export const ART_MANIFEST: Readonly<Record<ArtSlot, ArtManifestEntry>> = Object.freeze({
  landing: entry("landing", "scene", "MathQuest landing scene"),
  "grade-5": entry("grade-5", "scene", "Grade 5 realm scene"),
  "grade-6": entry("grade-6", "scene", "Grade 6 realm scene"),
  "world-map": entry("world-map", "scene", "World map"),
  library: entry("library", "scene", "Learning library"),
  ...Object.fromEntries(ENABLED_REALMS.map((id) => [`realm-${id}`, entry(`realm-${id}`, "scene", `${id} realm scene`)])),
  "hero-full": entry("hero-full", "character", "MathQuest hero"),
  "hero-portrait": entry("hero-portrait", "character", "Hero portrait"),
  "mentor-full": entry("mentor-full", "character", "MathQuest mentor"),
  "mentor-portrait": entry("mentor-portrait", "character", "Mentor portrait"),
  ...Object.fromEntries(ENABLED_REALMS.map((id) => [`minion-${id}`, entry(`minion-${id}`, "character", `${id} minion`)])),
  ...Object.fromEntries(ENABLED_REALMS.map((id) => [`boss-${id}`, entry(`boss-${id}`, "character", `${id} Guardian`)])),
  ...Object.fromEntries(ENABLED_REALMS.map((id) => [`plate-${id}`, entry(`plate-${id}`, "plate", `AI-generated math illustration for ${id}`)])),
} as Record<ArtSlot, ArtManifestEntry>);

export function artFor(slot: ArtSlot): ArtManifestEntry {
  return ART_MANIFEST[slot];
}

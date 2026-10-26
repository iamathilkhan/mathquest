import { ENABLED_REALMS, type RealmId } from "@/lib/config";

export type SceneArtSlot = "landing" | "grade-5" | "grade-6" | "world-map" | "library" | `realm-${RealmId}`;
export type CharacterArtSlot = "hero-full" | "hero-portrait" | "mentor-full" | "mentor-portrait" | `minion-${RealmId}` | `boss-${RealmId}` | "hero-knight-boy" | "hero-knight-girl" | "hero-mage-boy" | "hero-mage-girl" | "hero-ranger-boy" | "hero-ranger-girl" | "hero-knight-boy-portrait" | "hero-knight-girl-portrait" | "hero-mage-boy-portrait" | "hero-mage-girl-portrait" | "hero-ranger-boy-portrait" | "hero-ranger-girl-portrait";
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
  // Realm scene slots: use .jpg (AI pixel-art images generated offline)
  ...Object.fromEntries(ENABLED_REALMS.map((id) => [
    `realm-${id}`,
    { path: `/art/realm-${id}.jpg`, category: "scene" as const, alt: `${id} realm scene`, fallbackLabel: `${id} realm art unavailable` },
  ])),
  "hero-full": entry("hero-full", "character", "MathQuest hero"),
  "hero-portrait": entry("hero-portrait", "character", "Hero portrait"),
  "mentor-full": entry("mentor-full", "character", "MathQuest mentor"),
  "mentor-portrait": entry("mentor-portrait", "character", "Mentor portrait"),
  "hero-knight-boy": entry("hero-knight-boy", "character", "Knight boy hero"),
  "hero-knight-girl": entry("hero-knight-girl", "character", "Knight girl hero"),
  "hero-mage-boy": entry("hero-mage-boy", "character", "Mage boy hero"),
  "hero-mage-girl": entry("hero-mage-girl", "character", "Mage girl hero"),
  "hero-ranger-boy": entry("hero-ranger-boy", "character", "Ranger boy hero"),
  "hero-ranger-girl": entry("hero-ranger-girl", "character", "Ranger girl hero"),
  "hero-knight-boy-portrait": entry("hero-knight-boy-portrait", "character", "Knight boy hero portrait"),
  "hero-knight-girl-portrait": entry("hero-knight-girl-portrait", "character", "Knight girl hero portrait"),
  "hero-mage-boy-portrait": entry("hero-mage-boy-portrait", "character", "Mage boy hero portrait"),
  "hero-mage-girl-portrait": entry("hero-mage-girl-portrait", "character", "Mage girl hero portrait"),
  "hero-ranger-boy-portrait": entry("hero-ranger-boy-portrait", "character", "Ranger boy hero portrait"),
  "hero-ranger-girl-portrait": entry("hero-ranger-girl-portrait", "character", "Ranger girl hero portrait"),
  ...Object.fromEntries(ENABLED_REALMS.map((id) => [`minion-${id}`, entry(`minion-${id}`, "character", `${id} minion`)])),
  ...Object.fromEntries(ENABLED_REALMS.map((id) => [`boss-${id}`, entry(`boss-${id}`, "character", `${id} Guardian`)])),
  ...Object.fromEntries(ENABLED_REALMS.map((id) => [`plate-${id}`, entry(`plate-${id}`, "plate", `AI-generated math illustration for ${id}`)])),
} as Record<ArtSlot, ArtManifestEntry>);


export function artFor(slot: ArtSlot): ArtManifestEntry {
  return ART_MANIFEST[slot];
}

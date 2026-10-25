import { describe, expect, it } from "vitest";
import { ENABLED_REALMS } from "@/lib/config";
import { ART_MANIFEST } from "./artManifest";

describe("art slot manifest", () => {
  it("defines all scene, character, Guardian, minion, and illustration slots", () => {
    const slots = Object.keys(ART_MANIFEST);
    expect(slots).toContain("landing");
    expect(slots).toContain("grade-5");
    expect(slots).toContain("grade-6");
    expect(slots).toContain("world-map");
    expect(slots).toContain("library");
    expect(slots).toContain("hero-full");
    expect(slots).toContain("mentor-portrait");
    for (const realmId of ENABLED_REALMS) {
      expect(slots).toContain(`realm-${realmId}`);
      expect(slots).toContain(`minion-${realmId}`);
      expect(slots).toContain(`boss-${realmId}`);
      expect(slots).toContain(`plate-${realmId}`);
    }
    expect(slots).toHaveLength(33);
  });

  it("has a local path, alt text, and fallback label for every slot", () => {
    for (const art of Object.values(ART_MANIFEST)) {
      expect(art.path.startsWith("/art/")).toBe(true);
      expect(art.alt.length).toBeGreaterThan(0);
      expect(art.fallbackLabel.length).toBeGreaterThan(0);
    }
  });
});

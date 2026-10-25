import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import REALMS from "./curriculum";

describe("realm theme styles", () => {
  it("defines a theme class for every enabled realm", () => {
    const css = readFileSync("app/globals.css", "utf8");
    for (const realm of REALMS) {
      expect(css).toContain(`theme-${realm.theme}`);
    }
  });
});

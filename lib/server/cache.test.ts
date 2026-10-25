import { describe, expect, it } from "vitest";
import { TTLCache } from "./cache";

describe("TTLCache", () => {
  it("expires entries after the TTL", () => {
    let now = 1000;
    const cache = new TTLCache<string, string>(50, 10, () => now);

    cache.set("a", "1");
    expect(cache.get("a")).toBe("1");

    now = 1051;
    expect(cache.get("a")).toBeUndefined();
  });

  it("evicts the least recently used item when full", () => {
    const cache = new TTLCache<string, string>(5000, 2, () => 0);

    cache.set("a", "1");
    cache.set("b", "2");
    cache.get("a");
    cache.set("c", "3");

    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
    expect(cache.has("c")).toBe(true);
  });
});

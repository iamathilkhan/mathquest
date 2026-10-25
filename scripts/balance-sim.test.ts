import { describe, it, expect } from "vitest";
import { runSimulation, mulberry32 } from "./balance-sim";

describe("balance-sim determinism", () => {
  it("mulberry32 PRNG produces identical sequences with the same seed", () => {
    const prng1 = mulberry32(12345);
    const prng2 = mulberry32(12345);

    const seq1 = Array.from({ length: 100 }, () => prng1());
    const seq2 = Array.from({ length: 100 }, () => prng2());

    expect(seq1).toEqual(seq2);
  });

  it("runSimulation is completely deterministic given the same seed", () => {
    const sim1 = runSimulation({ seed: 777, battlesPerCell: 10 });
    const sim2 = runSimulation({ seed: 777, battlesPerCell: 10 });

    expect(sim1.results.length).toBe(sim2.results.length);
    for (let i = 0; i < sim1.results.length; i++) {
      expect(sim1.results[i].winRate).toBe(sim2.results[i].winRate);
      expect(sim1.results[i].avgHearts).toBe(sim2.results[i].avgHearts);
      expect(sim1.results[i].avgQuestions).toBe(sim2.results[i].avgQuestions);
      expect(sim1.results[i].avgXp).toBe(sim2.results[i].avgXp);
    }
  });
});

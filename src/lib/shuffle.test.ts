import assert from "node:assert/strict";
import { describe, it } from "node:test";
import spellingLists from "../data/spelling-lists.json";
import { createSeededRandom, seedFromString, shuffle } from "./shuffle";

describe("shuffle", () => {
  it("returns a different order when random values favor early swaps", () => {
    const words = ["a", "b", "c", "d"];
    const randoms = [0.2, 0.2, 0.2];
    let idx = 0;

    const result = shuffle(words, () => randoms[idx++] ?? 0.2);

    assert.equal(result.length, words.length);
    assert.notDeepEqual(result, words);
    assert.deepEqual(words, ["a", "b", "c", "d"]); // original not mutated
  });

  it("shuffles the first spelling list on initial load sequence", () => {
    const first = spellingLists[0];
    const baseOrder = first?.words.map((w) => w.word) ?? [];
    // Deterministic random values to force swaps
    const randoms = new Array(Math.max(0, baseOrder.length - 1)).fill(0.2);
    let i = 0;
    const shuffled = shuffle(baseOrder, () => randoms[i++] ?? 0.2);

    assert.equal(shuffled.length, baseOrder.length);
    assert.notDeepEqual(
      shuffled,
      baseOrder,
      "Initial shuffled order should differ from JSON order",
    );
  });

  it("produces the same order with the same seed across renders", () => {
    const list = ["alpha", "beta", "gamma", "delta", "epsilon"];
    const seed = seedFromString("week-1");
    const rngA = createSeededRandom(seed);
    const rngB = createSeededRandom(seed);

    const firstShuffle = shuffle(list, rngA);
    const secondShuffle = shuffle(list, rngB);

    assert.deepEqual(firstShuffle, secondShuffle);
    assert.notDeepEqual(firstShuffle, list);
  });
});

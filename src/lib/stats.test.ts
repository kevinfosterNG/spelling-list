import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aggregateStats, isCardCorrect } from "./stats";

describe("isCardCorrect", () => {
  it("returns true when spelling and bucket match regardless of casing", () => {
    const result = isCardCorrect(
      {
        word: { word: "Arctic", group: "ar" },
        spelling: "  arctic  ",
      },
      "ar",
    );

    assert.equal(result, true);
  });

  it("returns false when spelling is wrong or bucket is wrong", () => {
    const wrongSpelling = isCardCorrect(
      { word: { word: "air", group: "air" }, spelling: "are" },
      "air",
    );
    const wrongBucket = isCardCorrect(
      { word: { word: "bare", group: "are" }, spelling: "bare" },
      "air",
    );

    assert.equal(wrongSpelling, false);
    assert.equal(wrongBucket, false);
  });
});

describe("aggregateStats", () => {
  it("counts placed and correct cards and returns percent of total words", () => {
    const buckets = {
      ar: [
        { word: { word: "dark", group: "ar" }, spelling: "dark" },
        { word: { word: "farm", group: "ar" }, spelling: "frm" },
      ],
      air: [{ word: { word: "chair", group: "air" }, spelling: "chair" }],
    };

    const { placedCount, correctCount, percentCorrect } = aggregateStats(
      buckets,
      5,
    );

    assert.equal(placedCount, 3);
    assert.equal(correctCount, 2);
    assert.equal(percentCorrect, 40);
  });

  it("returns zeros safely when no words are present", () => {
    const { placedCount, correctCount, percentCorrect } = aggregateStats({}, 0);

    assert.equal(placedCount, 0);
    assert.equal(correctCount, 0);
    assert.equal(percentCorrect, 0);
  });
});

import { describe, expect, it } from "vitest";
import { canAddKeywordWatch, keywordWatchLimit } from "./intelAlerts";

describe("keywordWatchLimit", () => {
  it("agency has unlimited watches", () => {
    expect(keywordWatchLimit("agency")).toBe(-1);
    expect(canAddKeywordWatch("agency", 1000)).toBe(true);
  });

  it("enforces pro limit", () => {
    expect(keywordWatchLimit("pro")).toBe(25);
    expect(canAddKeywordWatch("pro", 25)).toBe(false);
  });
});

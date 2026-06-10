import { describe, expect, it } from "vitest";
import { keywordToSlug, sanitizeKeyword, slugToKeyword } from "./keywordUtils";

describe("sanitizeKeyword", () => {
  it("trims and strips control characters", () => {
    expect(sanitizeKeyword("  yoga mat  ")).toBe("yoga mat");
    expect(sanitizeKeyword("hello\x00world")).toBe("helloworld");
  });

  it("bounds length", () => {
    expect(sanitizeKeyword("a".repeat(200), 10)).toHaveLength(10);
  });
});

describe("keyword slug roundtrip", () => {
  it("encodes and decodes keywords for public URLs", () => {
    const keyword = "wireless earbuds";
    const slug = keywordToSlug(keyword);
    expect(slug).toBe("wireless-earbuds");
    expect(slugToKeyword(slug)).toBe(keyword);
  });
});

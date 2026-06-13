import { describe, expect, it } from "vitest";
import { normalizeIntelKeyword } from "./intelKeyword";

describe("normalizeIntelKeyword", () => {
  it("shortens long Amazon-style titles", () => {
    expect(
      normalizeIntelKeyword("Echo Dot (5th Gen, 2022 release) with clock and Alexa")
    ).toBe("echo dot 5th gen 2022");
  });

  it("keeps short keywords intact", () => {
    expect(normalizeIntelKeyword("wireless earbuds")).toBe("wireless earbuds");
  });
});

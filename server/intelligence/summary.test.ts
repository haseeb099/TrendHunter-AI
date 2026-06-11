import { describe, expect, it } from "vitest";
import { gapItemConfidence, intelCoverageLevel } from "./summary";

describe("intel coverage helpers", () => {
  it("intelCoverageLevel reflects signal availability", () => {
    expect(
      intelCoverageLevel(
        { fetchedAt: "2024-01-01" } as never,
        { fetchedAt: "2024-01-01" } as never
      )
    ).toBe("high");
    expect(intelCoverageLevel({ fetchedAt: "2024-01-01" } as never, null)).toBe("medium");
    expect(intelCoverageLevel(null, null)).toBe("low");
  });

  it("gapItemConfidence downgrades when coverage is low", () => {
    expect(gapItemConfidence("High", "Low", "high")).toBe("high");
    expect(gapItemConfidence("High", "Low", "low")).toBe("medium");
    expect(gapItemConfidence("Low", "High", "high")).toBe("low");
  });
});

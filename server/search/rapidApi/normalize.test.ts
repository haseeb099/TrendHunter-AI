import { describe, expect, it } from "vitest";
import { parseMoney } from "./normalize";

describe("parseMoney", () => {
  it("parses currency strings", () => {
    expect(parseMoney("$17.99")).toBe(17.99);
    expect(parseMoney(29.99)).toBe(29.99);
  });

  it("returns 0 for invalid values", () => {
    expect(parseMoney(null)).toBe(0);
    expect(parseMoney("")).toBe(0);
  });
});

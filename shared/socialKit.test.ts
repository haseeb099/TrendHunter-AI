import { describe, expect, it } from "vitest";
import { canSaveMoreKits, savedSocialKitLimit } from "./socialKit";

describe("savedSocialKitLimit", () => {
  it("allows agency unlimited saves", () => {
    expect(savedSocialKitLimit("agency")).toBe(-1);
    expect(canSaveMoreKits("agency", 999)).toBe(true);
  });

  it("blocks pro at limit", () => {
    expect(savedSocialKitLimit("pro")).toBe(30);
    expect(canSaveMoreKits("pro", 30)).toBe(false);
    expect(canSaveMoreKits("pro", 29)).toBe(true);
  });

  it("starter cannot save", () => {
    expect(savedSocialKitLimit("starter")).toBe(0);
    expect(canSaveMoreKits("starter", 0)).toBe(false);
  });
});

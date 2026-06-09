import { describe, expect, it } from "vitest";
import { getStorageBackend, isS3Configured } from "./storage";

describe("storage helpers", () => {
  it("reports local backend in default dev env", () => {
    expect(isS3Configured()).toBe(false);
    expect(getStorageBackend()).toBe("local");
  });
});

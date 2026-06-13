import { describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  getDb: vi.fn(async () => null),
}));

describe("buildMarketDigest", () => {
  it("returns empty sections when db is unavailable", async () => {
    const { buildMarketDigest } = await import("./marketDigest");
    const digest = await buildMarketDigest("US");
    expect(digest.rising).toEqual([]);
    expect(digest.metaHot).toEqual([]);
    expect(digest.tiktokHot).toEqual([]);
    expect(digest.opportunities).toEqual([]);
  });
});

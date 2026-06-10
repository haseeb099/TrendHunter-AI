import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getValidTrendingSnapshot: vi.fn(async () => null),
  getStaleTrendingSnapshot: vi.fn(async () => null),
  upsertTrendingSnapshot: vi.fn(async () => undefined),
}));

describe("getTrendingFeed", () => {
  it("returns mock trending products when no live data", async () => {
    const { getTrendingFeed } = await import("./trending/index");
    const feed = await getTrendingFeed({ region: "US" });
    expect(feed.results.length).toBeGreaterThan(0);
    expect(feed.isDemo).toBe(true);
    expect(feed.sources).toContain("mock");
  });
});

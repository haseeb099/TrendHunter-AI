import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getValidTrendingSnapshot: vi.fn(async () => null),
  upsertTrendingSnapshot: vi.fn(async () => undefined),
}));

vi.mock("./search/index", () => ({
  searchProducts: vi.fn(async () => ({
    results: [],
    sources: [],
    isDemo: true,
  })),
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

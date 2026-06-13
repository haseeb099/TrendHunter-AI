import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import { createTestContext, createTestUser } from "./testHelpers";

const mockTrendSignal = {
  keyword: "yoga mat",
  region: "US",
  momentumScore: 72,
  momentumLabel: "rising" as const,
  changePercent7d: 8,
  changePercent30d: 12,
  changePercent90d: 18,
  risingQueries: ["thick yoga mat"],
  interestOverTime: [{ date: "2026-01-01", value: 50 }],
  fetchedAt: new Date().toISOString(),
  isLive: false,
  source: "cached" as const,
};

const mockAdSnapshot = {
  keyword: "yoga mat",
  region: "US",
  activeAdCount: 12,
  advertiserCount: 8,
  creatives: [],
  gaps: [],
  fetchedAt: new Date().toISOString(),
  isLive: false,
  source: "cached" as const,
};

const mockTikTokSnapshot = {
  keyword: "yoga mat",
  region: "US",
  activeAdCount: 5,
  advertiserCount: 4,
  creatives: [],
  gaps: [],
  fetchedAt: new Date().toISOString(),
  isLive: false,
  source: "cached" as const,
};

vi.mock("./intelligence/trends", () => ({
  getTrendSignal: vi.fn(async (_k: string, _r: string, opts?: { live?: boolean }) => ({
    ...mockTrendSignal,
    isLive: Boolean(opts?.live),
  })),
}));

vi.mock("./intelligence/adLibrary", () => ({
  getAdLibrarySnapshot: vi.fn(async () => mockAdSnapshot),
  isMetaAdLibraryConfigured: vi.fn(() => true),
}));

vi.mock("./intelligence/tiktokAds", () => ({
  getTikTokAdsSnapshot: vi.fn(async () => mockTikTokSnapshot),
  isTikTokAdsConfigured: vi.fn(() => true),
  listTikTokAdKeywords: vi.fn(async () => []),
  tikTokAdsProvider: vi.fn(() => "searchapi" as const),
}));

vi.mock("./credits", async () => {
  const actual = await vi.importActual<typeof import("./credits")>("./credits");
  return {
    ...actual,
    spendCredits: vi.fn(async () => 1),
    getCreditWallet: vi.fn(async () => ({ balance: 100, monthlyAllowance: 100, remaining: 100 })),
  };
});

describe("intelligence router integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getTrendPulse returns signal and region", async () => {
    const caller = appRouter.createCaller(createTestContext());
    const result = await caller.intelligence.getTrendPulse({
      keyword: "yoga mat",
      region: "US",
    });

    expect(result.signal?.keyword).toBe("yoga mat");
    expect(result.region).toBe("US");
    expect(result.creditsUsed).toBe(0);
  });

  it("getTrendPulse spends credits on live refresh", async () => {
    const { spendCredits } = await import("./credits");
    const caller = appRouter.createCaller(createTestContext());
    const result = await caller.intelligence.getTrendPulse({
      keyword: "yoga mat",
      live: true,
    });

    expect(spendCredits).toHaveBeenCalledWith(expect.anything(), "trends_live", {
      keyword: "yoga mat",
    });
    expect(result.creditsUsed).toBe(1);
  });

  it("getAdRadar returns snapshot and configured flag", async () => {
    const caller = appRouter.createCaller(createTestContext());
    const result = await caller.intelligence.getAdRadar({
      keyword: "yoga mat",
      region: "UK",
    });

    expect(result.snapshot?.activeAdCount).toBe(12);
    expect(result.configured).toBe(true);
  });

  it("getTikTokRadar returns snapshot and provider", async () => {
    const caller = appRouter.createCaller(createTestContext());
    const result = await caller.intelligence.getTikTokRadar({
      keyword: "yoga mat",
    });

    expect(result.snapshot?.activeAdCount).toBe(5);
    expect(result.provider).toBe("searchapi");
    expect(result.configured).toBe(true);
  });

  it("rejects empty keywords", async () => {
    const caller = appRouter.createCaller(createTestContext());
    await expect(
      caller.intelligence.getTrendPulse({ keyword: "   " })
    ).rejects.toThrow(TRPCError);
  });

  it("requires authentication for protected intel routes", async () => {
    const caller = appRouter.createCaller(createTestContext(null));
    await expect(
      caller.intelligence.getTrendPulse({ keyword: "yoga mat" })
    ).rejects.toThrow(TRPCError);
  });
});

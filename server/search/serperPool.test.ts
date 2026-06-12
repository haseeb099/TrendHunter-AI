import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../_core/env", () => ({
  ENV: {
    serperApiKey: "key-primary",
    serperApiKeys: ["key-secondary", "key-tertiary"],
    serperWeeklyCap: 2500,
  },
}));

vi.mock("../dataPlatform/apiUsageWeekly", () => ({
  currentWeekKey: () => "2026-06-09",
  getWeeklyApiUsage: vi.fn(async (provider: string) => {
    if (provider === "serper#0") return 2500;
    if (provider === "serper#1") return 100;
    return 0;
  }),
  incrementWeeklyApiUsage: vi.fn(async () => 1),
  markWeeklyApiUsageAtCap: vi.fn(async () => undefined),
}));

describe("serperPool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dedupes keys from SERPER_API_KEY and SERPER_API_KEYS", async () => {
    const { getSerperApiKeys } = await import("./serperPool");
    expect(getSerperApiKeys()).toEqual(["key-primary", "key-secondary", "key-tertiary"]);
  });

  it("skips exhausted account and picks next key", async () => {
    const { resolveActiveSerperKey } = await import("./serperPool");
    const slot = await resolveActiveSerperKey();
    expect(slot?.index).toBe(1);
    expect(slot?.key).toBe("key-secondary");
  });

  it("detects quota errors for rotation", async () => {
    const { isSerperQuotaError } = await import("./serperPool");
    expect(isSerperQuotaError(429, "Too many requests")).toBe(true);
    expect(isSerperQuotaError(402, "Insufficient credits")).toBe(true);
    expect(isSerperQuotaError(500, "server error")).toBe(false);
  });
});

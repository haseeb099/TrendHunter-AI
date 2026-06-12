import { describe, expect, it, vi } from "vitest";
import {
  getProviderLiveTruthLabel,
  getSearchProviderDefinition,
  getSearchProviderDefinitions,
  shouldIncludeProvider,
} from "./providerRegistry";

vi.mock("./ebay", () => ({
  isEbayConfigured: vi.fn(() => false),
  searchEbay: vi.fn(),
}));

vi.mock("./serpapi", () => ({
  isSerpApiConfigured: vi.fn(() => false),
  isSerpConfigured: vi.fn(() => false),
  searchAmazon: vi.fn(),
  searchGoogleShopping: vi.fn(),
}));

vi.mock("./tiktok", () => ({
  isTikTokConfigured: vi.fn(() => false),
  searchTikTok: vi.fn(),
}));

vi.mock("./aliexpress", () => ({
  isAliExpressSearchConfigured: vi.fn(() => false),
  searchAliExpress: vi.fn(),
}));

vi.mock("./cj", () => ({
  isCjSearchConfigured: vi.fn(() => false),
  searchCj: vi.fn(),
}));

vi.mock("./freeRetail", () => ({
  isFreeRetailEnabled: vi.fn(() => false),
  searchFreeRetail: vi.fn(),
}));

vi.mock("./shoptera", () => ({
  isShopteraEnabled: vi.fn(() => false),
  searchShoptera: vi.fn(),
}));

vi.mock("./ropeship", () => ({
  isRopeshipSearchConfigured: vi.fn(() => false),
  searchRopeship: vi.fn(),
}));

describe("providerRegistry", () => {
  it("lists all search providers with unique ids", () => {
    const definitions = getSearchProviderDefinitions();
    const ids = definitions.map((d) => d.id);

    expect(ids).toContain("ebay");
    expect(ids).toContain("cj");
    expect(ids).toContain("ropeship");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("maps CJ live truth label", () => {
    expect(getProviderLiveTruthLabel("cj")).toBe("Live from CJ Dropshipping");
    expect(getProviderLiveTruthLabel("free_retail")).toBe("Demo catalog");
  });

  it("includes CJ only for cj and all platforms", () => {
    const cj = getSearchProviderDefinition("cj");
    expect(cj).toBeDefined();
    expect(shouldIncludeProvider(cj!, { platform: "cj", freeRetailOk: false })).toBe(true);
    expect(shouldIncludeProvider(cj!, { platform: "ebay", freeRetailOk: false })).toBe(false);
    expect(shouldIncludeProvider(cj!, { platform: "all", freeRetailOk: false })).toBe(true);
  });

  it("excludes free retail when blocked", () => {
    const freeRetail = getSearchProviderDefinition("free_retail");
    expect(shouldIncludeProvider(freeRetail!, { platform: "all", freeRetailOk: false })).toBe(
      false
    );
    expect(shouldIncludeProvider(freeRetail!, { platform: "all", freeRetailOk: true })).toBe(true);
  });

  it("wires offers platform for sourcing providers", () => {
    expect(getSearchProviderDefinition("cj")?.offersPlatform).toBe("cj");
    expect(getSearchProviderDefinition("aliexpress")?.offersPlatform).toBe("aliexpress");
  });
});

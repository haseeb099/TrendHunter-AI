import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductSearchResult } from "@shared/searchTypes";

vi.mock("../suppliers/cj", () => ({
  isCjApiConfigured: vi.fn(() => true),
  queryCjProducts: vi.fn(),
}));

vi.mock("../truthMode", () => ({
  getStrictTruthMode: vi.fn(async () => false),
}));

describe("searchCj", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty when CJ is not configured", async () => {
    const cjSupplier = await import("../suppliers/cj");
    vi.mocked(cjSupplier.isCjApiConfigured).mockReturnValue(false);

    const { searchCj } = await import("./cj");
    const results = await searchCj("wireless earbuds", "US");

    expect(results).toEqual([]);
    expect(cjSupplier.queryCjProducts).not.toHaveBeenCalled();
  });

  it("maps CJ API products via normalizeProduct", async () => {
    const cjSupplier = await import("../suppliers/cj");
    vi.mocked(cjSupplier.isCjApiConfigured).mockReturnValue(true);
    vi.mocked(cjSupplier.queryCjProducts).mockResolvedValue({
      products: [
        {
          pid: "cj-100",
          productNameEn: "LED Strip Lights",
          sellPrice: 12.5,
          warehouse: "US",
          deliveryTimeMax: 7,
          productImage: "https://cdn.example/cj.jpg",
          productUrl: "https://cjdropshipping.com/product/cj-100",
        },
      ],
      live: true,
    });

    const { searchCj } = await import("./cj");
    const results = await searchCj("led lights", "US", { maxResults: 5 });

    expect(cjSupplier.queryCjProducts).toHaveBeenCalledWith(
      "led lights",
      expect.objectContaining({
        pageSize: 5,
        pageNum: 1,
        region: "US",
        countryCode: "US",
      })
    );
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: "cj-100",
      title: "LED Strip Lights",
      price: 12.5,
      platform: "cj",
      supplier: "CJ Dropshipping",
      shipFrom: "US",
      currency: "USD",
    } satisfies Partial<ProductSearchResult>);
  });

  it("stops when CJ API returns no live products", async () => {
    const cjSupplier = await import("../suppliers/cj");
    vi.mocked(cjSupplier.isCjApiConfigured).mockReturnValue(true);
    vi.mocked(cjSupplier.queryCjProducts).mockResolvedValue({
      products: [],
      live: false,
      error: "CJ API error (401)",
    });

    const { searchCj } = await import("./cj");
    const results = await searchCj("charger", "UK");

    expect(results).toEqual([]);
  });
});

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("searchFreeRetail", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("dummyjson.com")) {
          return {
            ok: true,
            json: async () => ({
              products: [
                {
                  id: 1,
                  title: "Test Phone",
                  price: 99,
                  thumbnail: "https://example.com/p.jpg",
                  rating: 4.5,
                  brand: "Acme",
                  category: "electronics",
                },
              ],
            }),
          };
        }
        if (String(url).includes("fakestoreapi.com")) {
          return {
            ok: true,
            json: async () => [
              {
                id: 2,
                title: "Test Jacket",
                price: 49,
                image: "https://example.com/j.jpg",
                category: "men's clothing",
                rating: { rate: 4.2 },
              },
            ],
          };
        }
        throw new Error(`Unexpected URL: ${url}`);
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("merges DummyJSON and FakeStore results", async () => {
    const { searchFreeRetail } = await import("./freeRetail");
    const results = await searchFreeRetail("test", "US");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.platform === "shopify")).toBe(true);
  });
});

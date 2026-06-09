import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { createTestContext } from "./testHelpers";
import * as db from "./db";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getWatchlist: vi.fn(),
    addToWatchlist: vi.fn(),
    removeFromWatchlist: vi.fn(),
  };
});

describe("watchlist router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the user watchlist", async () => {
    vi.mocked(db.getWatchlist).mockResolvedValue([
      {
        id: 1,
        userId: 1,
        productId: "p1",
        productTitle: "Test Product",
        productImage: null,
        platform: "amazon",
        price: 19.99,
        sourceUrl: null,
        notes: null,
        createdAt: new Date(),
      },
    ]);

    const caller = appRouter.createCaller(createTestContext());
    const result = await caller.watchlist.getWatchlist();

    expect(result).toHaveLength(1);
    expect(db.getWatchlist).toHaveBeenCalledWith(1);
  });

  it("adds an item to the watchlist", async () => {
    const caller = appRouter.createCaller(createTestContext());
    await caller.watchlist.addToWatchlist({
      productId: "p2",
      productTitle: "New Product",
      platform: "ebay",
      price: 9.99,
    });

    expect(db.addToWatchlist).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        productId: "p2",
        productTitle: "New Product",
      })
    );
  });

  it("requires authentication", async () => {
    const caller = appRouter.createCaller(createTestContext(null));
    await expect(caller.watchlist.getWatchlist()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

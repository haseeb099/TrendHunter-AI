import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { createTestContext } from "./testHelpers";
import * as db from "./db";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getPipelineItems: vi.fn(),
    createPipelineItem: vi.fn(),
    deletePipelineItem: vi.fn(),
  };
});

describe("pipeline router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists pipeline items for the user", async () => {
    vi.mocked(db.getPipelineItems).mockResolvedValue([
      {
        id: 1,
        userId: 1,
        productId: "p1",
        productTitle: "Pipeline Product",
        productImage: null,
        platform: "shopify",
        price: 25,
        sourceUrl: null,
        stage: "testing",
        validationScore: 80,
        estimatedProfit: null,
        notes: null,
        testResults: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const caller = appRouter.createCaller(createTestContext());
    const items = await caller.pipeline.getPipelineItems();

    expect(items).toHaveLength(1);
    expect(items[0]?.stage).toBe("testing");
  });

  it("creates a pipeline item", async () => {
    const caller = appRouter.createCaller(createTestContext());
    await caller.pipeline.createPipelineItem({
      productTitle: "New Pipeline Item",
      stage: "testing",
    });

    expect(db.createPipelineItem).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        productTitle: "New Pipeline Item",
        stage: "testing",
      })
    );
  });
});

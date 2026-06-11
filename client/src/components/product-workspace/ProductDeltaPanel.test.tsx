import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductDeltaPanel } from "./ProductDeltaPanel";
import type { ProductSearchResult } from "@shared/searchTypes";

const product: ProductSearchResult = {
  id: "p1",
  title: "LED Desk Lamp",
  price: 24.99,
  platform: "ebay",
  image: null,
  shippingDays: 4,
  supplier: null,
  rating: 4.4,
  sourceUrl: null,
  canonicalProductId: "canonical-1",
};

const useQueryMock = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    product: {
      getDelta: {
        useQuery: (...args: unknown[]) => useQueryMock(...args),
      },
    },
  },
}));

describe("ProductDeltaPanel", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
  });

  it("shows loading state", () => {
    useQueryMock.mockReturnValue({ isLoading: true, data: undefined });

    render(<ProductDeltaPanel product={product} />);

    expect(screen.getByText("Loading daily changes…")).toBeInTheDocument();
  });

  it("renders snapshot diff details", () => {
    useQueryMock.mockReturnValue({
      isLoading: false,
      data: { added: true, removed: false, scoreDelta: 6 },
    });

    render(<ProductDeltaPanel product={product} region="US" />);

    expect(screen.getByText("What changed today?")).toBeInTheDocument();
    expect(screen.getByText("New in today's trending snapshot")).toBeInTheDocument();
    expect(screen.getByText("Trend score delta: +6")).toBeInTheDocument();
  });

  it("shows stable message when diff is empty", () => {
    useQueryMock.mockReturnValue({
      isLoading: false,
      data: { added: false, removed: false, scoreDelta: null },
    });

    render(<ProductDeltaPanel product={product} />);

    expect(screen.getByText("Stable since last snapshot.")).toBeInTheDocument();
  });

  it("shows unavailable message when query returns no data", () => {
    useQueryMock.mockReturnValue({ isLoading: false, data: null });

    render(<ProductDeltaPanel product={product} />);

    expect(
      screen.getByText(/No snapshot diff yet — available after the next daily ingest/)
    ).toBeInTheDocument();
  });
});

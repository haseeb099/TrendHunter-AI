import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextMovesPanel } from "./NextMovesPanel";
import type { ProductSearchResult } from "@shared/searchTypes";

const product: ProductSearchResult = {
  id: "p1",
  title: "Portable Blender",
  price: 34.99,
  platform: "ebay",
  image: null,
  shippingDays: 7,
  supplier: null,
  rating: 4.2,
  sourceUrl: null,
};

const useQueryMock = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    product: {
      getNextMoves: {
        useQuery: (...args: unknown[]) => useQueryMock(...args),
      },
    },
  },
}));

describe("NextMovesPanel", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
  });

  it("renders recommended moves from trpc", () => {
    useQueryMock.mockReturnValue({
      data: {
        moves: [
          {
            title: "Validate demand",
            description: "Run AI validation on margin and competition.",
            priority: "high",
          },
          {
            title: "Source alternates",
            description: "Compare CJ and AliExpress landed cost.",
            priority: "medium",
          },
        ],
      },
    });

    render(<NextMovesPanel product={product} />);

    expect(screen.getByText("Recommended next moves")).toBeInTheDocument();
    expect(screen.getByText("Validate demand")).toBeInTheDocument();
    expect(screen.getByText("Source alternates")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("shows empty state when no moves returned", () => {
    useQueryMock.mockReturnValue({ data: { moves: [] } });

    render(<NextMovesPanel product={product} />);

    expect(
      screen.getByText(/Run validation and supplier search to unlock next-move recommendations/)
    ).toBeInTheDocument();
  });
});

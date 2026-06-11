import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductWhyPanel } from "./ProductWhyPanel";
import type { ProductSearchResult } from "@shared/searchTypes";

const product: ProductSearchResult = {
  id: "p1",
  title: "Wireless Earbuds",
  price: 29.99,
  platform: "ebay",
  image: null,
  shippingDays: 5,
  supplier: "CJ",
  rating: 4.5,
  sourceUrl: null,
  trendScore: 78,
  rankReason: "Strong momentum in earbuds niche",
  trendScoreInputs: {
    baseScore: 50,
    ratingBoost: 10,
    shippingBoost: 5,
    priceBoost: 8,
    trendingFlag: 5,
    momentumScore: 82,
  },
  rankingExplanation: {
    version: "v2",
    summary: "Rising search interest with balanced competition signals.",
    confidence: "high",
    topSignals: [
      { name: "Trend momentum", score: 82, weight: 0.18, contribution: 14.8 },
      { name: "Margin spread", score: 75, weight: 0.14, contribution: 10.5 },
    ],
  },
};

describe("ProductWhyPanel", () => {
  it("renders summary and top signals", () => {
    render(<ProductWhyPanel product={product} />);

    expect(screen.getByText("Why this product?")).toBeInTheDocument();
    expect(
      screen.getByText("Rising search interest with balanced competition signals.")
    ).toBeInTheDocument();
    expect(screen.getByText(/Trend momentum: 82\/100/)).toBeInTheDocument();
    expect(screen.getByText(/Margin spread: 75\/100/)).toBeInTheDocument();
  });

  it("falls back to rankReason when explanation summary is missing", () => {
    render(
      <ProductWhyPanel
        product={{
          ...product,
          rankingExplanation: undefined,
        }}
      />
    );

    expect(screen.getByText("Strong momentum in earbuds niche")).toBeInTheDocument();
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import {
  resetIngestLiveBudget,
  consumeIngestLiveSearch,
  getIngestLiveBudgetRemaining,
} from "./liveBudget";

describe("ingest liveBudget", () => {
  beforeEach(() => {
    resetIngestLiveBudget(5);
  });

  it("consumes budget until exhausted", () => {
    expect(consumeIngestLiveSearch()).toBe(true);
    expect(consumeIngestLiveSearch()).toBe(true);
    expect(getIngestLiveBudgetRemaining()).toBe(3);
    resetIngestLiveBudget(2);
    expect(consumeIngestLiveSearch()).toBe(true);
    expect(consumeIngestLiveSearch()).toBe(true);
    expect(consumeIngestLiveSearch()).toBe(false);
  });
});

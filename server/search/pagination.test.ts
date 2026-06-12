import { describe, expect, it } from "vitest";
import { paginateResults } from "./pagination";

describe("paginateResults", () => {
  const items = Array.from({ length: 10 }, (_, i) => `item-${i}`);

  it("returns first page with totalCount and nextCursor", () => {
    const page = paginateResults(items, { cursor: 0, limit: 4 });
    expect(page.items).toEqual(["item-0", "item-1", "item-2", "item-3"]);
    expect(page.totalCount).toBe(10);
    expect(page.nextCursor).toBe(4);
  });

  it("returns last page without nextCursor", () => {
    const page = paginateResults(items, { cursor: 8, limit: 4 });
    expect(page.items).toEqual(["item-8", "item-9"]);
    expect(page.nextCursor).toBeUndefined();
  });

  it("clamps negative cursor to zero", () => {
    const page = paginateResults(items, { cursor: -5, limit: 3 });
    expect(page.items).toEqual(["item-0", "item-1", "item-2"]);
    expect(page.nextCursor).toBe(3);
  });

  it("returns empty slice when cursor exceeds totalCount", () => {
    const page = paginateResults(items, { cursor: 20, limit: 5 });
    expect(page.items).toEqual([]);
    expect(page.totalCount).toBe(10);
    expect(page.nextCursor).toBeUndefined();
  });
});

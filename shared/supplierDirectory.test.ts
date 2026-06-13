import { describe, expect, it } from "vitest";
import {
  filterSuppliersByCategory,
  GLOBAL_SUPPLIER_DIRECTORY,
  supplierCoversCategory,
} from "./supplierDirectory";

describe("supplierDirectory", () => {
  it("lists at least 18 global suppliers", () => {
    expect(GLOBAL_SUPPLIER_DIRECTORY.length).toBeGreaterThanOrEqual(18);
  });

  it("includes China and Western marketplaces", () => {
    const origins = new Set(GLOBAL_SUPPLIER_DIRECTORY.map((s) => s.origin));
    expect(origins.has("China")).toBe(true);
    expect(origins.has("US")).toBe(true);
  });

  it("filters garden and jewelry niches", () => {
    const garden = filterSuppliersByCategory("garden");
    const jewelry = filterSuppliersByCategory("jewelry");
    expect(garden.length).toBeGreaterThan(0);
    expect(jewelry.length).toBeGreaterThan(0);
    expect(garden.every((s) => supplierCoversCategory(s, "garden"))).toBe(true);
    expect(jewelry.every((s) => supplierCoversCategory(s, "jewelry"))).toBe(true);
  });

  it("builds search URLs for every supplier", () => {
    for (const supplier of GLOBAL_SUPPLIER_DIRECTORY) {
      const url = supplier.buildSearchUrl("test product");
      expect(url.startsWith("http")).toBe(true);
      expect(supplier.homepageUrl.startsWith("http")).toBe(true);
    }
  });
});

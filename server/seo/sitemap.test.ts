import { describe, expect, it } from "vitest";
import { buildSitemapXml } from "./sitemap";

describe("buildSitemapXml", () => {
  it("returns valid urlset with homepage", async () => {
    const xml = await buildSitemapXml();
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("<urlset");
    expect(xml).toContain("<loc>");
  });
});

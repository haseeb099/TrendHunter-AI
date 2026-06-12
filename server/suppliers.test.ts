import { describe, expect, it } from "vitest";
import { getOffersForProduct, getOffersStatus } from "./suppliers";

describe("suppliers", () => {
  it("getOffersStatus reports off mode without API keys", () => {
    const status = getOffersStatus();
    expect(status.cj.mode).toBe("off");
    expect(status.aliexpress.mode).toBe("off");
  });

  it("getOffersForProduct returns empty without configured suppliers", async () => {
    const result = await getOffersForProduct({ title: "Wireless Earbuds", region: "US" });
    expect(result.offers).toEqual([]);
    expect(result.dataMode).toBe("cached");
    expect(result.matchState).toBe("none");
    expect(result.message).toBeTruthy();
  });
});

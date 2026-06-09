import { describe, expect, it } from "vitest";
import { signAliExpressParams } from "./signing";

describe("signAliExpressParams", () => {
  it("produces deterministic uppercase MD5 signature", () => {
    const params = {
      app_key: "test_app",
      method: "aliexpress.affiliate.product.query",
      sign_method: "md5",
      timestamp: "1234567890",
      format: "json",
      v: "2.0",
      keywords: "earbuds",
    };
    const sign = signAliExpressParams(params, "test_secret");
    expect(sign).toMatch(/^[A-F0-9]{32}$/);
    expect(signAliExpressParams(params, "test_secret")).toBe(sign);
  });

  it("changes when secret changes", () => {
    const params = { app_key: "a", method: "m", sign_method: "md5", timestamp: "1" };
    const a = signAliExpressParams(params, "secret1");
    const b = signAliExpressParams(params, "secret2");
    expect(a).not.toBe(b);
  });
});

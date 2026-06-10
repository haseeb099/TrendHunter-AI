import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { assertRateLimit } from "./_core/rateLimit";

describe("public trend rate limit", () => {
  it("blocks excessive requests per IP bucket", async () => {
    const key = `public-trend:ip:test-${Date.now()}`;
    for (let i = 0; i < 60; i++) {
      await assertRateLimit(key, 60, 60_000);
    }
    await expect(assertRateLimit(key, 60, 60_000)).rejects.toThrow(TRPCError);
  });
});

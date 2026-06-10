import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { assertRateLimit } from "./rateLimit";

describe("assertRateLimit", () => {
  it("allows attempts within the limit", async () => {
    const key = `test:${Date.now()}`;
    await expect(assertRateLimit(key, 3, 60_000)).resolves.toBeUndefined();
    await expect(assertRateLimit(key, 3, 60_000)).resolves.toBeUndefined();
    await expect(assertRateLimit(key, 3, 60_000)).resolves.toBeUndefined();
  });

  it("blocks attempts over the limit", async () => {
    const key = `test-block:${Date.now()}`;
    await assertRateLimit(key, 2, 60_000);
    await assertRateLimit(key, 2, 60_000);
    await expect(assertRateLimit(key, 2, 60_000)).rejects.toThrow(TRPCError);
  });
});

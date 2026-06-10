import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { assertRateLimit } from "./rateLimit";

describe("assertRateLimit", () => {
  it("allows attempts within the limit", () => {
    const key = `test:${Date.now()}`;
    expect(() => assertRateLimit(key, 3, 60_000)).not.toThrow();
    expect(() => assertRateLimit(key, 3, 60_000)).not.toThrow();
    expect(() => assertRateLimit(key, 3, 60_000)).not.toThrow();
  });

  it("blocks attempts over the limit", () => {
    const key = `test-block:${Date.now()}`;
    assertRateLimit(key, 2, 60_000);
    assertRateLimit(key, 2, 60_000);
    expect(() => assertRateLimit(key, 2, 60_000)).toThrow(TRPCError);
  });
});

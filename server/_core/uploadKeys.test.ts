import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { assertUserOwnsUploadKey, buildUserUploadKey } from "./uploadKeys";

describe("uploadKeys", () => {
  it("builds user-scoped storage keys", () => {
    expect(buildUserUploadKey(42, "products", "image.png")).toBe("users/42/products/image.png");
  });

  it("allows keys under the user prefix", () => {
    expect(() => assertUserOwnsUploadKey(42, "users/42/products/image.png")).not.toThrow();
  });

  it("rejects keys outside the user prefix", () => {
    expect(() => assertUserOwnsUploadKey(42, "users/99/products/image.png")).toThrow(TRPCError);
    expect(() => assertUserOwnsUploadKey(42, "uploads/shared.png")).toThrow(TRPCError);
  });
});

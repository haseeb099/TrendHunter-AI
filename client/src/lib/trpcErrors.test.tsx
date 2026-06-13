import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCClientError } from "@trpc/client";
import {
  ACCOUNT_DEACTIVATED_ERR_MSG,
  PLAN_FORBIDDEN_ERR_MSG,
  SUBSCRIPTION_INACTIVE_ERR_MSG,
  UNAUTHED_ERR_MSG,
} from "@shared/const";
import { isRetryableTrpcError, toastTrpcError } from "./trpcErrors";

const toastError = vi.fn();

vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastError(...args) },
}));

function trpcError(message: string, code = "FORBIDDEN") {
  return new TRPCClientError(message, {
    result: { error: { message, code: -32603, data: { code } } },
  } as never);
}

describe("trpcErrors", () => {
  beforeEach(() => {
    toastError.mockClear();
  });

  it("isRetryableTrpcError detects provider failures", () => {
    expect(isRetryableTrpcError(trpcError("Provider unavailable", "INTERNAL_SERVER_ERROR"))).toBe(true);
    expect(isRetryableTrpcError(new Error("nope"))).toBe(false);
  });

  it("toastTrpcError routes subscription errors to billing", () => {
    toastTrpcError(trpcError(SUBSCRIPTION_INACTIVE_ERR_MSG));
    expect(toastError).toHaveBeenCalledWith(
      "Your subscription is inactive.",
      expect.objectContaining({ action: expect.objectContaining({ label: "Billing" }) })
    );
  });

  it("toastTrpcError routes plan errors to billing", () => {
    toastTrpcError(trpcError(PLAN_FORBIDDEN_ERR_MSG));
    expect(toastError).toHaveBeenCalledWith(
      "Upgrade your plan to use this feature.",
      expect.objectContaining({ action: expect.objectContaining({ label: "View plans" }) })
    );
  });

  it("toastTrpcError handles deactivated accounts without billing CTA", () => {
    toastTrpcError(trpcError(ACCOUNT_DEACTIVATED_ERR_MSG));
    expect(toastError).toHaveBeenCalledWith(
      "Your account has been deactivated. Contact support for help."
    );
  });

  it("toastTrpcError handles unauthenticated users", () => {
    toastTrpcError(trpcError(UNAUTHED_ERR_MSG));
    expect(toastError).toHaveBeenCalledWith(
      "Please sign in to continue.",
      expect.objectContaining({ action: expect.objectContaining({ label: "Login" }) })
    );
  });
});

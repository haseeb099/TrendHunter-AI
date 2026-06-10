import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import { createTestContext, createTestUser } from "./testHelpers";
import * as db from "./db";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getUserById: vi.fn(),
    updateUserAdmin: vi.fn(),
    logAdminAction: vi.fn(),
    getAdminOverviewStats: vi.fn(async () => ({
      totalUsers: 0,
      activeUsers: 0,
      flaggedUsers: 0,
      pausedUsers: 0,
      deactivatedUsers: 0,
      trialUsers: 0,
      paidUsers: 0,
      adminUsers: 1,
      searchesToday: 0,
      aiCallsToday: 0,
      newSignupsToday: 0,
      activeUsers7d: 0,
    })),
  };
});

describe("admin router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin callers", async () => {
    const caller = appRouter.createCaller(createTestContext(createTestUser({ role: "user" })));

    await expect(caller.admin.getOverview()).rejects.toThrow(TRPCError);
  });

  it("prevents admin from demoting themselves", async () => {
    const admin = createTestUser({ id: 1, role: "admin" });
    vi.mocked(db.getUserById).mockResolvedValue(admin);

    const caller = appRouter.createCaller(createTestContext(admin));

    await expect(
      caller.admin.updateUser({ userId: 1, role: "user" })
    ).rejects.toThrow(/Cannot demote yourself/);
  });

  it("allows admin overview for admins", async () => {
    const admin = createTestUser({ role: "admin" });
    const caller = appRouter.createCaller(createTestContext(admin));

    const overview = await caller.admin.getOverview();
    expect(overview).toBeDefined();
  });
});

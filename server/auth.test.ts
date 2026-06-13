import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import { createTestContext, createTestUser } from "./testHelpers";
import { hashPassword } from "./_core/password";
import * as db from "./db";
import * as planCatalog from "./planCatalog";

vi.mock("./_core/env", async () => {
  const actual = await vi.importActual<typeof import("./_core/env")>("./_core/env");
  return {
    ...actual,
    ENV: {
      ...actual.ENV,
      cookieSecret: "test-jwt-secret-minimum-32-characters-long",
    },
  };
});

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getUserByEmail: vi.fn(),
    createUser: vi.fn(),
    assertDatabaseAvailable: vi.fn(),
  };
});

vi.mock("./planCatalog", async () => {
  const actual = await vi.importActual<typeof import("./planCatalog")>("./planCatalog");
  return {
    ...actual,
    getPlatformSettings: vi.fn(async () => ({
      self_serve_billing: true,
      trial_days: 3,
      registration_enabled: true,
    })),
  };
});

vi.mock("./_core/rateLimit", () => ({
  assertAuthRateLimit: vi.fn(),
}));

vi.mock("./_core/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./_core/env")>();
  return {
    ...actual,
    ENV: {
      ...actual.ENV,
      cookieSecret: "test-jwt-secret-minimum-32-characters-long",
    },
  };
});

describe("auth login/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers a new user when email is available", async () => {
    const created = createTestUser({ id: 42, email: "new@example.com" });
    vi.mocked(db.getUserByEmail).mockResolvedValue(undefined);
    vi.mocked(db.createUser).mockResolvedValue(created);

    const ctx = createTestContext(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.register({
      email: "new@example.com",
      password: "password123",
      name: "New User",
      acceptedTerms: true,
      acceptedPrivacy: true,
    });

    expect(result.email).toBe("new@example.com");
    expect(db.createUser).toHaveBeenCalled();
  });

  it("rejects duplicate registration", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(createTestUser({ email: "taken@example.com" }));

    const caller = appRouter.createCaller(createTestContext(null));
    await expect(
      caller.auth.register({
        email: "taken@example.com",
        password: "password123",
        acceptedTerms: true,
        acceptedPrivacy: true,
      })
    ).rejects.toThrow(/already registered/);
  });

  it("logs in with valid credentials", async () => {
    const password = "password123";
    const user = createTestUser({
      email: "user@example.com",
      passwordHash: hashPassword(password),
    });
    vi.mocked(db.getUserByEmail).mockResolvedValue(user);

    const caller = appRouter.createCaller(createTestContext(null));
    const result = await caller.auth.login({
      email: "user@example.com",
      password,
    });

    expect(result.email).toBe("user@example.com");
  });

  it("rejects invalid login credentials", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(
      createTestUser({ passwordHash: hashPassword("other-password") })
    );

    const caller = appRouter.createCaller(createTestContext(null));
    await expect(
      caller.auth.login({ email: "user@example.com", password: "wrong-password" })
    ).rejects.toThrow(TRPCError);
  });

  it("blocks login for deactivated accounts", async () => {
    vi.mocked(db.getUserByEmail).mockResolvedValue(
      createTestUser({
        accountStatus: "deactivated",
        passwordHash: hashPassword("password123"),
      })
    );

    const caller = appRouter.createCaller(createTestContext(null));
    await expect(
      caller.auth.login({ email: "user@example.com", password: "password123" })
    ).rejects.toThrow(/deactivated/);
  });

  it("respects registration_enabled platform setting", async () => {
    vi.mocked(planCatalog.getPlatformSettings).mockResolvedValue({
      self_serve_billing: true,
      trial_days: 3,
      registration_enabled: false,
    });

    const caller = appRouter.createCaller(createTestContext(null));
    await expect(
      caller.auth.register({
        email: "blocked@example.com",
        password: "password123",
        acceptedTerms: true,
        acceptedPrivacy: true,
      })
    ).rejects.toThrow(/registrations are temporarily closed/);
  });
});

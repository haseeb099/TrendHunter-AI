import "dotenv/config";
import mysql from "mysql2/promise";
import type { SearchProviderStatus } from "../shared/searchTypes";

const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
const email = process.env.TEST_EMAIL ?? `e2e-${Date.now()}@trendhunter.test`;
const password = process.env.TEST_PASSWORD ?? "testpass123";
const newPassword = process.env.TEST_NEW_PASSWORD ?? "newpass45678";
const betaInviteCode = process.env.BETA_INVITE_CODE?.trim();

type TrpcEnvelope = {
  result?: {
    data?: {
      json?: unknown;
    };
  };
  error?: {
    json?: {
      message?: string;
    };
  };
};

async function trpcMutation(path: string, input: unknown, cookie?: string) {
  const response = await fetch(`${baseUrl}/api/trpc/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({ json: input }),
  });

  const setCookie = response.headers.get("set-cookie");
  const payload = (await response.json()) as TrpcEnvelope;
  if (payload.error) {
    throw new Error(payload.error.json?.message ?? `tRPC error on ${path}`);
  }

  return {
    data: payload.result?.data?.json,
    cookie: setCookie?.split(";")[0] ?? cookie,
  };
}

async function trpcMutationExpectError(path: string, input: unknown, cookie?: string) {
  const response = await fetch(`${baseUrl}/api/trpc/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({ json: input }),
  });

  const payload = (await response.json()) as TrpcEnvelope;
  if (!payload.error) {
    throw new Error(`Expected tRPC error on ${path}`);
  }
  return payload.error.json?.message ?? "unknown error";
}

async function trpcQuery(path: string, input: unknown, cookie?: string) {
  const inputParam = encodeURIComponent(JSON.stringify({ json: input }));
  const response = await fetch(`${baseUrl}/api/trpc/${path}?input=${inputParam}`, {
    headers: cookie ? { cookie } : {},
  });

  const payload = (await response.json()) as TrpcEnvelope;
  if (payload.error) {
    throw new Error(payload.error.json?.message ?? `tRPC error on ${path}`);
  }

  return payload.result?.data?.json;
}

async function trpcQueryExpectError(path: string, input: unknown, cookie?: string) {
  const inputParam = encodeURIComponent(JSON.stringify({ json: input }));
  const response = await fetch(`${baseUrl}/api/trpc/${path}?input=${inputParam}`, {
    headers: cookie ? { cookie } : {},
  });

  const payload = (await response.json()) as TrpcEnvelope;
  if (!payload.error) {
    throw new Error(`Expected tRPC error on ${path}`);
  }
  return payload.error.json?.message ?? "unknown error";
}

function assertProviderStatusShape(providers: unknown): asserts providers is SearchProviderStatus[] {
  if (!Array.isArray(providers) || providers.length === 0) {
    throw new Error("Provider status must be a non-empty array");
  }

  for (const provider of providers) {
    if (
      typeof provider !== "object" ||
      provider === null ||
      typeof (provider as SearchProviderStatus).id !== "string" ||
      typeof (provider as SearchProviderStatus).label !== "string" ||
      typeof (provider as SearchProviderStatus).configured !== "boolean" ||
      !Array.isArray((provider as SearchProviderStatus).platforms) ||
      !["free", "paid"].includes((provider as SearchProviderStatus).tier)
    ) {
      throw new Error(`Invalid provider status shape: ${JSON.stringify(provider)}`);
    }
  }
}

async function deactivateUserByEmail(targetEmail: string): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("⚠ Skipping inactive-user test — DATABASE_URL not set");
    return;
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    await conn.execute("UPDATE users SET accountStatus = ? WHERE email = ?", [
      "deactivated",
      targetEmail,
    ]);
  } finally {
    await conn.end();
  }
}

async function expireSubscriptionByEmail(targetEmail: string): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("⚠ Skipping expired-subscription test — DATABASE_URL not set");
    return;
  }

  const conn = await mysql.createConnection(databaseUrl);
  try {
    await conn.execute("UPDATE users SET planStatus = ? WHERE email = ?", [
      "expired",
      targetEmail,
    ]);
  } finally {
    await conn.end();
  }
}

function pass(msg: string) {
  console.log(`✓ ${msg}`);
}

console.log(`=== Launch E2E API test @ ${baseUrl} ===\n`);

try {
  const deepHealth = (await trpcQuery("system.deepHealth", undefined)) as {
    ok?: boolean;
    checks?: Record<string, unknown>;
  };
  pass(`Deep health: ok=${deepHealth.ok} checks=${JSON.stringify(deepHealth.checks)}`);

  console.log(`Registering ${email} with legal acceptance...`);
  const register = await trpcMutation("auth.register", {
    email,
    password,
    name: "E2E Tester",
    acceptedTerms: true,
    acceptedPrivacy: true,
    ...(betaInviteCode ? { inviteCode: betaInviteCode } : {}),
  });
  let cookie = register.cookie;
  pass("Registered with terms + privacy acceptance");

  await trpcMutation("auth.logout", undefined, cookie);
  pass("Logged out");

  const login = await trpcMutation("auth.login", { email, password });
  cookie = login.cookie ?? cookie;
  pass("Logged back in");

  const me = await trpcQuery("auth.me", undefined, cookie);
  if (!me || typeof me !== "object") {
    throw new Error("auth.me returned empty after login");
  }
  pass("Session verified via auth.me");

  if (process.env.PASSWORD_RESET_TEST_MODE === "true") {
    const forgot = await trpcMutation("auth.forgotPassword", { email }, cookie);
    const token = (forgot.data as { testResetToken?: string } | undefined)?.testResetToken;
    if (!token) {
      console.log(
        "⚠ Skipping password reset test — restart server with PASSWORD_RESET_TEST_MODE=true"
      );
    } else {
      await trpcMutation("auth.resetPassword", { token, newPassword }, cookie);
      pass("Password reset via test mode");

      const relogin = await trpcMutation("auth.login", { email, password: newPassword });
      cookie = relogin.cookie ?? cookie;
      pass("Logged in with reset password");
    }
  } else {
    console.log("⚠ Skipping password reset test — set PASSWORD_RESET_TEST_MODE=true");
  }

  const inactiveEmail = `inactive-${Date.now()}@trendhunter.test`;
  await trpcMutation("auth.register", {
    email: inactiveEmail,
    password,
    name: "Inactive User",
    acceptedTerms: true,
    acceptedPrivacy: true,
    ...(betaInviteCode ? { inviteCode: betaInviteCode } : {}),
  });
  await deactivateUserByEmail(inactiveEmail);

  const loginBlockedMsg = await trpcMutationExpectError("auth.login", {
    email: inactiveEmail,
    password,
  });
  if (!loginBlockedMsg.toLowerCase().includes("deactivated")) {
    throw new Error(`Expected deactivated login block, got: ${loginBlockedMsg}`);
  }
  pass("Inactive (deactivated) user blocked at login");

  const expiredEmail = `expired-${Date.now()}@trendhunter.test`;
  const expiredRegister = await trpcMutation("auth.register", {
    email: expiredEmail,
    password,
    name: "Expired Sub User",
    acceptedTerms: true,
    acceptedPrivacy: true,
    ...(betaInviteCode ? { inviteCode: betaInviteCode } : {}),
  });
  await expireSubscriptionByEmail(expiredEmail);

  const expiredLogin = await trpcMutation("auth.login", { email: expiredEmail, password });
  const expiredCookie = expiredLogin.cookie ?? expiredRegister.cookie;

  const searchBlockedMsg = await trpcQueryExpectError(
    "search.searchProducts",
    {
      query: "wireless earbuds",
      platform: "all",
      filters: { priceRange: { min: 0, max: 500 }, region: "US" },
    },
    expiredCookie
  );
  if (!searchBlockedMsg.includes("inactive")) {
    throw new Error(`Expected inactive subscription block on search, got: ${searchBlockedMsg}`);
  }
  pass("Expired subscription blocked from search");

  const billingSub = await trpcQuery("billing.getSubscription", undefined, expiredCookie);
  if (!billingSub || typeof billingSub !== "object") {
    throw new Error("Inactive user should still read billing.getSubscription");
  }
  pass("Expired subscription can still read billing status");

  const providers = await trpcQuery("search.getProviderStatus", undefined, cookie);
  assertProviderStatusShape(providers);
  pass(`Provider status shape valid (${providers.length} providers)`);

  await trpcMutation("analytics.recordDiscoverView", { region: "US" }, cookie);
  pass("Discover view recorded");

  const search = (await trpcQuery(
    "search.searchProducts",
    {
      query: "wireless earbuds",
      platform: "all",
      filters: { priceRange: { min: 0, max: 500 }, region: "US" },
    },
    cookie
  )) as { results?: Array<{ title: string; platform: string }> };

  const firstResult = search.results?.[0];
  if (!firstResult) {
    throw new Error("Search returned no results for discover flow");
  }
  pass(`Search returned ${search.results?.length ?? 0} results`);

  await trpcMutation(
    "watchlist.addToWatchlist",
    {
      productId: firstResult.title.toLowerCase().replace(/\s+/g, "-"),
      productTitle: firstResult.title,
      platform: firstResult.platform,
      price: 19.99,
      region: "US",
    },
    cookie
  );
  const watchlist = (await trpcQuery("watchlist.getWatchlist", undefined, cookie)) as unknown[];
  pass(`Watchlist item added (count=${watchlist.length})`);

  if (process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY) {
    const validation = await trpcMutation(
      "validate.validateProduct",
      {
        productTitle: firstResult.title,
        platform: firstResult.platform,
        price: 19.99,
        region: "US",
      },
      cookie
    );
    const score = (validation.data as { overallScore?: number })?.overallScore;
    pass(`Product validated (overallScore=${score ?? "n/a"})`);
  } else {
    console.log("⚠ Skipping validate step — no AI key configured");
  }

  const pipeline = await trpcMutation(
    "pipeline.createPipelineItem",
    {
      productTitle: firstResult.title,
      platform: firstResult.platform,
      price: 19.99,
      stage: "testing",
      sourceUrl: "https://example.com/product",
      validationScore: 72,
      landedCost: 8.5,
    },
    cookie
  );
  pass(`Pipeline item created: ${JSON.stringify(pipeline.data)}`);

  const filterOptions = await trpcQuery("search.getFilterOptions", undefined, cookie);
  console.log(
    "✓ Filter options regions:",
    (filterOptions as { regions?: unknown[] })?.regions?.length
  );

  const trending = (await trpcQuery(
    "trending.getFeed",
    { region: "US", category: "electronics" },
    cookie
  )) as { isDemo?: boolean; results?: unknown[] };
  console.log(`✓ Trending feed: demo=${trending.isDemo} count=${trending.results?.length ?? 0}`);

  const offersResponse = (await trpcQuery(
    "supplier.getOffersForProduct",
    { title: firstResult.title, region: "US" },
    cookie
  )) as { offers?: Array<{ supplierPlatform: string }> } | Array<{ supplierPlatform: string }>;
  const offers = Array.isArray(offersResponse) ? offersResponse : (offersResponse.offers ?? []);
  console.log(
    `✓ Supplier offers: ${offers.length} (platforms: ${offers.map((o) => o.supplierPlatform).join(",")})`
  );

  const storage = await trpcQuery("upload.getStatus", undefined, cookie);
  console.log("✓ Storage:", JSON.stringify(storage));

  const metrics = await trpcQuery("analytics.getDashboardMetrics", undefined, cookie);
  console.log("✓ Analytics metrics:", JSON.stringify(metrics));

  console.log("\nAll launch E2E API checks passed.");
} catch (error) {
  console.error("\nLaunch E2E test failed:", error);
  process.exitCode = 1;
}

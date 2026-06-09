import "dotenv/config";

const baseUrl = process.env.APP_URL ?? "http://localhost:3005";
const email = process.env.TEST_EMAIL ?? `e2e-${Date.now()}@trendhunter.test`;
const password = process.env.TEST_PASSWORD ?? "testpass123";

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

console.log(`=== E2E API test @ ${baseUrl} ===\n`);

try {
  console.log(`Registering ${email}...`);
  const register = await trpcMutation("auth.register", {
    email,
    password,
    name: "E2E Tester",
  });
  const cookie = register.cookie;
  console.log("✓ Registered and signed in");

  const providers = await trpcQuery("search.getProviderStatus", undefined, cookie);
  console.log("✓ Provider status:", JSON.stringify(providers));

  const filterOptions = await trpcQuery("search.getFilterOptions", undefined, cookie);
  console.log("✓ Filter options regions:", (filterOptions as { regions?: unknown[] })?.regions?.length);

  const trending = (await trpcQuery(
    "trending.getFeed",
    { region: "US", category: "electronics" },
    cookie
  )) as { isDemo?: boolean; results?: unknown[] };
  console.log(`✓ Trending feed: demo=${trending.isDemo} count=${trending.results?.length ?? 0}`);

  const search = (await trpcQuery(
    "search.searchProducts",
    {
      query: "wireless earbuds",
      platform: "all",
      filters: { priceRange: { min: 0, max: 500 }, region: "US" },
    },
    cookie
  )) as {
    isDemo?: boolean;
    sources?: string[];
    results?: Array<{ title: string; platform: string; price: number }>;
  };
  console.log(
    `✓ Search: demo=${search.isDemo} sources=${search.sources?.join(",")} count=${search.results?.length ?? 0}`
  );
  if (search.results?.[0]) {
    console.log(`  First result: [${search.results[0].platform}] ${search.results[0].title}`);
  }

  const offers = (await trpcQuery(
    "supplier.getOffersForProduct",
    { title: "Wireless Earbuds", region: "US" },
    cookie
  )) as Array<{ supplierPlatform: string; landedCost: number }>;
  console.log(`✓ Supplier offers: ${offers.length} (platforms: ${offers.map((o) => o.supplierPlatform).join(",")})`);

  await trpcMutation(
    "search.saveFilterPreset",
    { name: "E2E US electronics", filters: { region: "US", category: "electronics" } },
    cookie
  );
  const presets = await trpcQuery("search.getFilterPresets", undefined, cookie);
  console.log("✓ Filter presets:", Array.isArray(presets) ? presets.length : 0);

  await trpcMutation("analytics.recordDiscoverView", { region: "US" }, cookie);

  const storage = await trpcQuery("upload.getStatus", undefined, cookie);
  console.log("✓ Storage:", JSON.stringify(storage));

  const pipeline = await trpcMutation(
    "pipeline.createPipelineItem",
    {
      productTitle: "E2E Test Product",
      platform: "manual",
      price: 19.99,
      stage: "testing",
      sourceUrl: "https://example.com/product",
      validationScore: 72,
      landedCost: 8.5,
    },
    cookie
  );
  console.log("✓ Pipeline item created:", JSON.stringify(pipeline.data));

  const metrics = await trpcQuery("analytics.getDashboardMetrics", undefined, cookie);
  console.log("✓ Analytics metrics:", JSON.stringify(metrics));

  console.log("\nAll E2E API checks passed.");
} catch (error) {
  console.error("\nE2E test failed:", error);
  process.exitCode = 1;
}

import "dotenv/config";

const key = process.env.RAPIDAPI_KEY?.trim();
if (!key) {
  console.error("RAPIDAPI_KEY missing");
  process.exit(1);
}

type Probe = { group: string; name: string; host: string; path: string; query?: string; method?: string; body?: unknown };

const PROBES: Probe[] = [
  // eBay
  { group: "eBay", name: "Real-Time eBay /search", host: "real-time-ebay-data.p.rapidapi.com", path: "/search", query: "query=wireless+earbuds&country=us&limit=3" },
  { group: "eBay", name: "Real-Time eBay /search-v2", host: "real-time-ebay-data.p.rapidapi.com", path: "/search-v2", query: "query=earbuds&country=us" },
  { group: "eBay", name: "eBay Data API /search", host: "ebay-data-api.p.rapidapi.com", path: "/search", query: "query=earbuds&country=us" },
  { group: "eBay", name: "eBay Data API /ebay-search", host: "ebay-data-api.p.rapidapi.com", path: "/ebay-search", query: "q=earbuds" },

  // Walmart
  { group: "Walmart", name: "Real-Time Walmart /search", host: "real-time-walmart-data.p.rapidapi.com", path: "/search", query: "query=desk+lamp&page=1" },
  { group: "Walmart", name: "Walmart API /search", host: "walmart.p.rapidapi.com", path: "/search", query: "query=desk+lamp" },
  { group: "Walmart", name: "Walmart2 /search", host: "walmart2.p.rapidapi.com", path: "/search", query: "query=desk+lamp" },
  { group: "Walmart", name: "Axesso Walmart /wlm-search-by-keyword", host: "axesso-walmart-data-service.p.rapidapi.com", path: "/wlm/walmart-search-by-keyword", query: "keyword=desk+lamp&page=1" },
  { group: "Walmart", name: "Axesso Walmart /search", host: "axesso-walmart-data-service.p.rapidapi.com", path: "/search", query: "keyword=desk+lamp" },

  // AliExpress
  { group: "AliExpress", name: "AliExpress DataHub item_search", host: "aliexpress-datahub.p.rapidapi.com", path: "/item_search", query: "q=phone+case&page=1" },
  { group: "AliExpress", name: "AliExpress DataHub item_search2", host: "aliexpress-datahub.p.rapidapi.com", path: "/item_search2", query: "q=phone+case" },
  { group: "AliExpress", name: "AliExpress Business /search", host: "aliexpress-business-api.p.rapidapi.com", path: "/search", query: "query=phone+case" },
  { group: "AliExpress", name: "AliExpress Business /products", host: "aliexpress-business-api.p.rapidapi.com", path: "/products", query: "q=phone+case" },
  { group: "AliExpress", name: "FREE Aliexpress /search", host: "free-aliexpress-api.p.rapidapi.com", path: "/search", query: "query=phone+case" },
  { group: "AliExpress", name: "FREE Aliexpress /products", host: "free-aliexpress-api.p.rapidapi.com", path: "/products", query: "q=phone+case" },
  { group: "AliExpress", name: "Ali Express /search", host: "ali-express1.p.rapidapi.com", path: "/search", query: "query=phone+case" },
  { group: "AliExpress", name: "Ali Express root", host: "ali-express1.p.rapidapi.com", path: "/", query: "q=phone+case" },

  // News / Search
  { group: "News", name: "Real-Time News /search", host: "real-time-news-data.p.rapidapi.com", path: "/search", query: "query=dropshipping&limit=3" },
  { group: "News", name: "Real-Time News /topic-headlines", host: "real-time-news-data.p.rapidapi.com", path: "/topic-headlines", query: "topic=technology&limit=3" },
  { group: "News", name: "News API /everything", host: "news-api14.p.rapidapi.com", path: "/v2/everything", query: "query=dropshipping" },
  { group: "News", name: "News API /search", host: "news-api14.p.rapidapi.com", path: "/search", query: "q=dropshipping" },
  { group: "News", name: "Google News /search", host: "google-news13.p.rapidapi.com", path: "/search", query: "q=dropshipping&lr=en-US" },
  { group: "News", name: "Google News root", host: "google-news13.p.rapidapi.com", path: "/", query: "q=dropshipping" },
  { group: "News", name: "Real-Time Web Search", host: "real-time-web-search.p.rapidapi.com", path: "/search", query: "q=dropshipping+products" },
  { group: "News", name: "Real-Time Web Search root", host: "real-time-web-search.p.rapidapi.com", path: "/", query: "q=dropshipping" },
];

async function probe(p: Probe) {
  const url = `https://${p.host}${p.path}${p.query ? `?${p.query}` : ""}`;
  try {
    const res = await fetch(url, {
      method: p.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": p.host,
        "x-rapidapi-key": key!,
      },
      body: p.body != null ? JSON.stringify(p.body) : undefined,
    });
    const text = await res.text();
    const preview = text.slice(0, 500).replace(/\s+/g, " ");
    const notSub = preview.includes("not subscribed");
    const notFound = preview.includes("does not exist");
    const ok = res.ok && !notSub && !notFound;
    return { ok, status: res.status, preview, host: p.host, path: p.path };
  } catch (err) {
    return { ok: false, status: 0, preview: String(err), host: p.host, path: p.path };
  }
}

async function main() {
  console.log("RapidAPI endpoint discovery\n");
  let lastGroup = "";
  const working: Array<Probe & { status: number; preview: string }> = [];

  for (const p of PROBES) {
    if (p.group !== lastGroup) {
      console.log(`\n## ${p.group}`);
      lastGroup = p.group;
    }
    const r = await probe(p);
    console.log(`${r.ok ? "✓" : "✗"} ${p.name} (${r.status})`);
    if (!r.ok) console.log(`   ${r.preview.slice(0, 200)}`);
    else {
      console.log(`   ${r.preview.slice(0, 200)}`);
      working.push({ ...p, status: r.status, preview: r.preview });
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log("\n\n=== WORKING ENDPOINTS ===");
  for (const w of working) {
    console.log(`${w.group}: ${w.host}${w.path}`);
  }
}

main();

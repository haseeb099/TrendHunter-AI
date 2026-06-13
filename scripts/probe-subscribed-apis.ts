import "dotenv/config";
import { writeFileSync } from "node:fs";

const key = process.env.RAPIDAPI_KEY!.trim();

type Probe = { name: string; host: string; path: string };

const PROBES: Probe[] = [
  // eBay variants
  { name: "ebay-data-api1 /search", host: "ebay-data-api1.p.rapidapi.com", path: "/search?query=earbuds&limit=2" },
  { name: "ebay-data-api1 /ebay-search", host: "ebay-data-api1.p.rapidapi.com", path: "/ebay-search?query=earbuds" },
  { name: "ebay-data-api /search", host: "ebay-data-api.p.rapidapi.com", path: "/search?query=earbuds" },
  { name: "ebay-data-api /product-search", host: "ebay-data-api.p.rapidapi.com", path: "/product-search?query=earbuds" },

  // Working — deeper endpoints
  { name: "Axesso Walmart keyword", host: "axesso-walmart-data-service.p.rapidapi.com", path: "/wlm/walmart-search-by-keyword?keyword=wireless+earbuds&page=1&sortBy=best_match" },
  { name: "AliExpress DataHub search", host: "aliexpress-datahub.p.rapidapi.com", path: "/item_search?q=wireless+earbuds&page=1" },
  { name: "AliExpress DataHub search2", host: "aliexpress-datahub.p.rapidapi.com", path: "/item_search_2?q=wireless+earbuds" },
  { name: "AliExpress DataHub deals", host: "aliexpress-datahub.p.rapidapi.com", path: "/item_search_superdeals?q=earbuds" },
  { name: "FREE Aliexpress root", host: "free-aliexpress-api.p.rapidapi.com", path: "/api/search?query=earbuds" },
  { name: "FREE Aliexpress products", host: "free-aliexpress-api.p.rapidapi.com", path: "/api/products/search?query=earbuds" },
  { name: "FREE Aliexpress v1", host: "free-aliexpress-api.p.rapidapi.com", path: "/v1/search?query=earbuds" },
  { name: "AliExpress Business", host: "aliexpress-business-api.p.rapidapi.com", path: "/api/product/search?query=earbuds" },
  { name: "Web Search", host: "real-time-web-search.p.rapidapi.com", path: "/search?q=wireless+earbuds+deals&num=5" },
  { name: "News search", host: "real-time-news-data.p.rapidapi.com", path: "/search?query=wireless+earbuds&limit=3" },
  { name: "News API top", host: "news-api14.p.rapidapi.com", path: "/v2/top-headlines?language=en" },
  { name: "News API everything", host: "news-api14.p.rapidapi.com", path: "/v2/everything?query=dropshipping" },
  { name: "Google News v2", host: "google-news-api1.p.rapidapi.com", path: "/search?q=dropshipping" },
  { name: "TikTok Scraper user feed", host: "tiktok-api-fast-reliable-data-scraper.p.rapidapi.com", path: "/user/feed?username=khaby.lame&count=5" },
  { name: "Tiktok API search video", host: "tiktok-api23.p.rapidapi.com", path: "/api/search/video?keyword=wireless+earbuds&count=5" },
  { name: "Tiktok API user info", host: "tiktok-api23.p.rapidapi.com", path: "/api/user/info?uniqueId=khaby.lame" },
];

async function probe(p: Probe) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(`https://${p.host}${p.path}`, {
      signal: ctrl.signal,
      headers: { "x-rapidapi-host": p.host, "x-rapidapi-key": key },
    });
    const text = await res.text();
    const ok =
      res.ok &&
      !text.includes("not subscribed") &&
      !text.includes("does not exist") &&
      !text.includes("API is unreachable");
    return { ...p, ok, status: res.status, body: text };
  } catch (e) {
    return { ...p, ok: false, status: 0, body: String(e) };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const results = [];
  for (const p of PROBES) {
    const r = await probe(p);
    results.push(r);
    console.log(`${r.ok ? "OK" : "NO"} ${r.name} [${r.status}]`);
    if (r.ok) console.log(`   ${r.body.slice(0, 200).replace(/\s+/g, " ")}`);
    else console.log(`   ${r.body.slice(0, 120).replace(/\s+/g, " ")}`);
    await new Promise((res) => setTimeout(res, 600));
  }

  const working = results.filter((r) => r.ok);
  writeFileSync(
    "scripts/probe-results.json",
    JSON.stringify(
      working.map((w) => ({ name: w.name, host: w.host, path: w.path.split("?")[0], sample: w.body.slice(0, 800) })),
      null,
      2
    )
  );
  console.log(`\n${working.length} working endpoints saved to scripts/probe-results.json`);
}

main();

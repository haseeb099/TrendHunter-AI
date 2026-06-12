# Free vs Paid API Providers

DropHunter treats **free** and **paid** search/supplier APIs differently. Free APIs are scraped on a schedule, stored in the product catalog, and rate-limited per provider. Paid APIs are used for live user search with daily credit caps.

See also: [API-ENV-SETUP.md](./API-ENV-SETUP.md)

---

## Strategy

| Tier | When called | Limits | Storage |
|------|-------------|--------|---------|
| **Free** | Hourly ingest only (`pnpm ingest:trending`, server scheduler) | Per-provider hourly/daily + throttle | Cached in DB catalog + trending snapshots |
| **Paid** | User live search + ingest when budget allows | Daily caps (`*_DAILY_CAP`) | Cached after first live hit |

User-facing Discover reads **cached DB data** — never burns free API quota on page load.

---

## Free providers (configured)

### Shoptera — 300 searches/hour

- **Env:** `SHOPTERA_ENABLED=true`
- **Limit:** `SHOPTERA_HOURLY_CAP=300` (default)
- **Docs:** https://shoptera.ai
- **Ingest:** Every hour via `runFreeProviderIngestCycle` + trending queue
- **Regions:** US, UK, EU origin filters

### CJ Dropshipping — points + 1 req/sec

- **Env:** `CJ_API_KEY`
- **Limits:**
  - `CJ_MIN_INTERVAL_MS=1000` — free/Plus tier ≈ 1 request/second
  - `CJ_DAILY_POINTS_CAP=200` — tune to your CJ account points quota
- **Docs:** https://developers.cjdropshipping.com
- **Notes:** CJ uses a points-based daily quota (replaces legacy “daily call limit”). Higher sales levels allow faster req/s (2–6/sec).

### RapidAPI — shared key, ingest-only pool

All RapidAPI providers use one `RAPIDAPI_KEY` with **separate monthly caps** per API subscription. They run on **daily ingest only** (`pnpm ingest:daily`), never on user page loads. Each call requests **max products per response** (`limit=10`) and skips duplicate queries within the month.

| API | Cap/month | Endpoint | Use |
|-----|-----------|----------|-----|
| Real-Time Amazon Data | 100 | `/product-category-list`, `/search` | Taxonomy + ASIN product search |
| Real-Time Product Search | 100 | `/search`, `/deals`, `/product-offers` | Catalog + multi-merchant offers |
| Google Search | 1000 | `/?query=` | Discovery URLs / niches |
| Etsy API | 45 | `/product/search` | Handmade niche products |
| Pangolinfo Amazon | 60 | `/` | Amazon scraper (if subscribed) |
| Lazada DataHub | 50 | `/item_search_image` | SEA supplier matches by image |
| Taobao DataHub | 50 | `/itemidstr_convert` | On-demand ID utility only |
| Alibaba API | 50 | `/alibaba/health-check` | Health probe (search disabled on free tier) |

- **Env:** `RAPIDAPI_KEY`, `RAPIDAPI_INGEST_MAX_PER_CYCLE=8`, per-API `*_MONTHLY_CAP`
- **Verify:** `pnpm verify:rapid-apis` / `pnpm verify:rapid-amazon`
- **Discover more:** `pnpm discover:rapid-apis` + [RAPIDAPI-SUBSCRIPTIONS.md](./RAPIDAPI-SUBSCRIPTIONS.md)
- **Files:** `server/search/rapidApi/`

### DummyJSON + FakeStore — no key

- **Env:** `FREE_RETAIL_ENABLED=true`
- **Limit:** 500 calls/hour (soft, ingest only)
- **Use:** Demo/QA and catalog padding when strict truth mode is off

---

## Paid providers (with free tiers noted)

### Serper.dev — Google Shopping / Web / Images / News / Places

- **Env:** `SERPER_API_KEY` + `SERPER_API_KEYS=key2,key3` — dashboard: https://serper.dev/dashboard
- **Limit:** `SERPER_WEEKLY_CAP=2500` per account per week (Monday UTC reset)
- **Rotation:** When account #1 hits 2,500, auto-switches to account #2, etc.
- **Endpoints used:** `/shopping`, `/search`, `/images`, `/news`, `/places`
- **Live search providers:** `serper`, `serper_web`, `serper_images`, `serper_news` in Discover
- **Ingest:** `runSerperIngestCycle` + trending supplement + discovery queue
- **Intelligence:** Trend proxy (news + related queries) when Google Trends unavailable
- **Discovery:** Related query suggestions via Serper web search
- **Priority:** Tried before SerpAPI for Google Shopping when both are configured

### SerpAPI — Amazon + Google Shopping

- **Env:** `SERPAPI_KEY`, `SERPAPI_DAILY_CAP`
- **Docs:** https://serpapi.com
- **Note:** Metered paid searches — use Serper first when possible

### eBay Browse API

- **Env:** `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`
- **Note:** Free sandbox after developer approval; production calls are metered

---

## Additional free APIs to consider

| Provider | Signup | Good for |
|----------|--------|----------|
| **Open Food Facts** | None | Health/grocery niche |
| **Open Beauty Facts** | None | Beauty SKU enrichment |
| **Best Buy API** | Free dev key | US electronics |
| **Walmart Open API** | Partner approval | US general retail |
| **RapidAPI free tiers** | Varies | AliExpress scrapers, Etsy |
| **GitHub public product datasets** | None | Seed / bootstrap catalog |

Add new providers in `server/search/` + register in `server/search/providerRegistry.ts` and `server/dataPlatform/providerBudget.ts`.

---

## Environment variables

```env
# Free ingest
SHOPTERA_ENABLED=true
SHOPTERA_HOURLY_CAP=300
CJ_API_KEY=
CJ_DAILY_POINTS_CAP=200
CJ_MIN_INTERVAL_MS=1000
FREE_RETAIL_ENABLED=true

# RapidAPI pool (ingest only)
RAPIDAPI_KEY=
RAPIDAPI_INGEST_MAX_PER_CYCLE=8
RAPIDAPI_AMAZON_MONTHLY_CAP=100
RAPIDAPI_PRODUCT_SEARCH_MONTHLY_CAP=100
RAPIDAPI_GOOGLE_SEARCH_MONTHLY_CAP=1000
RAPIDAPI_ETSY_MONTHLY_CAP=45
RAPIDAPI_PANGOLINFO_MONTHLY_CAP=60
RAPIDAPI_LAZADA_MONTHLY_CAP=50
RAPIDAPI_TAOBAO_MONTHLY_CAP=50
RAPIDAPI_ALIBABA_MONTHLY_CAP=50

# Serper multi-account pool
SERPER_API_KEY=
SERPER_API_KEYS=key2,key3
SERPER_WEEKLY_CAP=2500
SERPER_INGEST_MAX_PER_CYCLE=40
SERPAPI_KEY=
SERPAPI_DAILY_CAP=10

# Hourly trending + free scrape scheduler
INGEST_TRENDING_INTERVAL_HOURS=1
INGEST_HOURLY_LIVE_SEARCH_BUDGET=300
```

---

## Implementation files

| File | Role |
|------|------|
| `server/dataPlatform/providerBudget.ts` | Free vs paid rules, hourly/daily tracking |
| `server/ingest/freeProviderCycle.ts` | Hourly Shoptera + CJ + free retail scrape → catalog |
| `server/ingest/trendingQueue.ts` | Region × category queue with API budget deferral |
| `server/ingest/scheduler.ts` | Runs free scrape + trending every hour |
| `server/search/serper.ts` | Serper.dev Google Shopping integration |
| `server/search/rapidAmazon.ts` | RapidAPI Amazon category list + monthly cap |
| `server/search/amazonCategorySync.ts` | Cache + taxonomy enrich from Amazon departments |

---

## Manual commands

```bash
pnpm ingest:trending   # Free scrape + trending queue (respects all caps)
pnpm ingest:daily      # Full 24h intel + catalog refresh
```

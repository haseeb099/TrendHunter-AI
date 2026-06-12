# RapidAPI Free-Tier Recommendations

One `RAPIDAPI_KEY` works across all APIs, but **each API requires a separate free-tier subscription** on the RapidAPI hub (click "Subscribe to Test" on each API page).

See also: [FREE-API-PROVIDERS.md](./FREE-API-PROVIDERS.md)

---

## Already subscribed & wired

| API | Free cap | Best endpoints | Status |
|-----|----------|----------------|--------|
| [Real-Time Product Search](https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-product-search) | 100/mo | `/search`, `/deals`, `/product-offers` | **Working** — offers enrich 1 product → many merchants |
| [Real-Time Amazon Data](https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-amazon-data) | 100/mo | `/product-category-list`, `/search` | **Working** — ASIN products + taxonomy |
| [Google Search](https://rapidapi.com/google-search116/api/google-search) | 1000/mo | `/?query=` | **Working** — discovery URLs |
| [Etsy API](https://rapidapi.com/etsy-api2/api/etsy-api2) | 45/mo | `/product/search` | Flaky on free tier |
| [Lazada DataHub](https://rapidapi.com/lazada-datahub/api/lazada-datahub) | 50/mo | `/item_search_image` | Intermittent |
| [Taobao DataHub](https://rapidapi.com/taobao-datahub/api/taobao-datahub) | 50/mo | `/itemidstr_convert` | Utility only |
| [Alibaba API](https://rapidapi.com/alibaba-api2/api/alibaba-api2) | 50/mo | `/alibaba/health-check` | Health only — search disabled free |
| [Pangolinfo Amazon](https://rapidapi.com/pangolinfo-amazon-scraper-api/api/pangolinfo-amazon-scraper-api) | 60/mo | `/` | Invalid token on free tier |

---

## Top picks to subscribe next (free tier)

Prioritized for TrendHunter / dropshipping discovery. All are **OpenWeb Ninja** family unless noted — typically **100 requests/month**, **1000 req/hour** rate limit.

### 1. Real-Time eBay Data — HIGH

- **Link:** https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-ebay-data
- **Cap:** 100/mo free
- **Why:** 20 eBay domains (US, UK, DE, AU…), search + category browse + seller feedback
- **Fills gap:** Official eBay Browse API is sandbox-limited; this adds live listing data for EU/UK
- **Ingest use:** 1 search × `limit=10` per day, rotate category seeds

### 2. Real-Time Walmart Data — HIGH

- **Link:** https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-walmart-data
- **Cap:** 100/mo free
- **Why:** US + Canada retail — prices, offers, reviews
- **Fills gap:** No Walmart in current provider stack
- **Ingest use:** US region product search for general/home categories

### 3. Real-Time News Data — MEDIUM (intelligence)

- **Link:** https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-news-data
- **Cap:** 100/mo free (typical OpenWeb Ninja tier)
- **Why:** Trend/niche signals for Intelligence Center — complements Serper news
- **Ingest use:** 2–3 niche keywords per week (`dropshipping`, category names)

### 4. AliExpress DataHub — MEDIUM (suppliers)

- **Link:** https://rapidapi.com/ecommdatahub/api/aliexpress-datahub
- **Cap:** Free trial (verify current limit on pricing page)
- **Why:** Real-time AliExpress product data when official affiliate API is unavailable
- **Ingest use:** `item_search` + `item_detail` — 1 search → many SKUs

### 5. Reverse Image Search — MEDIUM

- **Link:** https://rapidapi.com/letscrape-6bRBa3QguO5/api/reverse-image-search (verify host on hub)
- **Cap:** 100/mo free
- **Why:** Find suppliers / duplicates from catalog product images
- **Ingest use:** 1–2 images/week from top trending products

### 6. Real-Time Costco / Wayfair / Home Depot — NICHE

| API | Best for |
|-----|----------|
| Costco | Bulk / home / health niches |
| Wayfair | Home & garden furniture |
| Home Depot | Tools & hardware (matches `tools` category) |

Each ~100/mo. Subscribe only if you want depth in that vertical.

---

## Lower priority

| API | Cap | Note |
|-----|-----|------|
| [Product Search API](https://rapidapi.com/remote-skills-remote-skills-default/api/product-search-api) (Remote Skills) | **10/mo** | 40+ marketplaces but tiny free tier |
| [Amazon Complete](https://rapidapi.com/flybyapi1/api/real-time-amazon-data-the-most-complete) | Varies | Overlaps with Real-Time Amazon Data you already have |
| [Taobao/Tmall product Data](https://rapidapi.com/tmapi-tmapi-default/api/taobao-tmall-product-data1) | Paid-heavy | You have Taobao DataHub utility already |

---

## How to subscribe

1. Log in at https://rapidapi.com
2. Open each API link above → **Subscribe to Test** (free plan)
3. No new key needed — same `RAPIDAPI_KEY` works
4. Add monthly cap to `.env` (e.g. `RAPIDAPI_EBAY_MONTHLY_CAP=100`)
5. Run `pnpm discover:rapid-apis` to verify access

---

## Data-per-request tips

| Technique | Saves requests |
|-----------|----------------|
| `limit=10` on every search | Max products per call |
| `/product-offers` after search | 1 ID → 10–40 merchant listings |
| Query dedup (`rapid_api_query_log`) | Skip same query in same month |
| `RAPIDAPI_INGEST_MAX_PER_CYCLE=8` | Spread 100/mo across ~12 days |
| Cache Amazon categories 30 days | 4 region calls/month max |
| Google Search for discovery | 1000/mo budget — use freely for URLs |

---

## Discover script

```bash
pnpm discover:rapid-apis
```

Probes subscribed bonus endpoints and lists which unsubscribed APIs return 403 (need subscribe).

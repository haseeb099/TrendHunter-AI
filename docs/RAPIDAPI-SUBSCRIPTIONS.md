# RapidAPI Subscriptions — Limits & Endpoints

Your single `RAPIDAPI_KEY` powers all APIs below. **Each API has its own quota** — tracked in `api_usage_monthly` (and `api_usage_daily` for daily-capped APIs).

**Refresh schedule (RapidAPI free tiers):**
- **Monthly caps** reset on the **1st of each calendar month** (UTC)
- **Daily caps** reset at **midnight UTC**
- **Hourly rate limits** (e.g. FREE Aliexpress 1000/hr) are enforced by RapidAPI at the gateway — we throttle via ingest caps

Run `pnpm discover:rapid-apis` to verify which endpoints respond with your key.

---

## Working & wired (verified)

| API | Host | Endpoint | Limit | Data per call | Wired |
|-----|------|----------|-------|---------------|-------|
| **eBay Data API** | `ebay-data-api1.p.rapidapi.com` | `GET /search` | 100/mo | ~20 listings | Yes |
| **Axesso Walmart** | `axesso-walmart-data-service.p.rapidapi.com` | `GET /wlm/walmart-search-by-keyword` | 50/mo | ~40 products | Yes |
| **Ali Express** | `ali-express1.p.rapidapi.com` | `GET /search` | 20/day | ~20 products | Yes |
| **AliExpress DataHub** | `aliexpress-datahub.p.rapidapi.com` | `GET /item_search` | 100/mo | variable | Yes (unreliable) |
| **Real-Time Web Search** | `real-time-web-search.p.rapidapi.com` | `GET /search` | 100/mo | 10 URLs | Yes |
| **Real-Time News Data** | `real-time-news-data.p.rapidapi.com` | `GET /search` | 100/mo | 5 articles | Yes |
| **News API** | `news-api14.p.rapidapi.com` | `GET /v2/search/articles` | 1000/mo | 10 articles | Yes |
| **TikTok Scraper** | `tiktok-api-fast-reliable-data-scraper.p.rapidapi.com` | `GET /user/feed` | 100/mo | 10 videos | Yes (intel) |
| **Tiktok API (Tikfly)** | `tiktok-api23.p.rapidapi.com` | `GET /api/search/video` | 100/mo | 10 videos | Yes (intel) |
| Real-Time Product Search | `real-time-product-search.p.rapidapi.com` | `/search`, `/product-offers` | 100/mo | 10 + merchants | Yes |
| Real-Time Amazon Data | `real-time-amazon-data.p.rapidapi.com` | `/product-category-list`, `/search` | 100/mo | categories / ASINs | Yes |
| Google Search | `google-search116.p.rapidapi.com` | `/?query=` | 1000/mo | 8+ URLs | Yes |

---

## Subscribed but NOT working / wrong API

| API you subscribed | Issue | Action |
|--------------------|-------|--------|
| **Real-Time eBay Data** | 403 not subscribed | Different API than **eBay Data API** — use `ebay-data-api1` (working) or re-subscribe to OpenWeb Ninja version |
| **Real-Time Walmart** | 403 not subscribed | Use **Axesso Walmart** (working) or subscribe to `real-time-walmart-data` on RapidAPI hub |
| **Walmart** (250/mo) | 403 — host unknown | Check RapidAPI playground for exact host after subscribe |
| **Google News** | 403 not subscribed | Subscribe on hub or use News API + Real-Time News Data instead |
| **FREE Aliexpress API** (5000/mo) | All probed paths 404 | Open RapidAPI playground — copy exact endpoint path from docs |
| **AliExpress Business** (25/day) | All probed paths 404 | Check playground for endpoint names |
| **Etsy / Pangolinfo / Lazada** | Flaky or token errors | Low priority — keep disabled if failing |

---

## Ingest strategy (free tier preservation)

Daily ingest (`pnpm ingest:daily`) runs **max 12 RapidAPI calls** per cycle (`RAPIDAPI_INGEST_MAX_PER_CYCLE`).

**Priority order (most data per request first):**
1. Ali Express search — 20 products, 20/day cap
2. eBay Data — 20 listings
3. Axesso Walmart — 40 products (US)
4. News API — 10 articles (1000/mo budget)
5. Real-Time News — 5 articles
6. Web Search — 10 organic results
7. Product Search + optional `/product-offers` enrichment
8. Amazon search / Google discovery

**Dedup:** `rapid_api_query_log` skips the same query+region within a calendar month.

---

## Environment variables

```env
RAPIDAPI_INGEST_MAX_PER_CYCLE=12

# New subscriptions
RAPIDAPI_EBAY_DATA_MONTHLY_CAP=100
RAPIDAPI_AXESSO_WALMART_MONTHLY_CAP=50
RAPIDAPI_ALI_EXPRESS_DAILY_CAP=20
RAPIDAPI_ALI_EXPRESS_MONTHLY_CAP=600
RAPIDAPI_ALIEXPRESS_DATAHUB_MONTHLY_CAP=100
RAPIDAPI_WEB_SEARCH_MONTHLY_CAP=100
RAPIDAPI_NEWS_DATA_MONTHLY_CAP=100
RAPIDAPI_NEWS_API_MONTHLY_CAP=1000
RAPIDAPI_TIKTOK_SCRAPER_MONTHLY_CAP=100
RAPIDAPI_TIKTOK_API_MONTHLY_CAP=100
```

---

## Monthly budget planner

| Provider | Cap | Safe daily calls (30-day month) |
|----------|-----|--------------------------------|
| News API | 1000 | ~33/day |
| Google Search | 1000 | ~33/day |
| eBay / Product Search / Amazon / Web / News | 100 each | ~3/day each |
| Axesso Walmart | 50 | ~1-2/day |
| Ali Express | 20/day | 20/day hard stop |
| AliExpress DataHub | 100 | ~3/day |

**Total wired monthly APIs:** ~2,650+ requests/month if fully used — ingest throttling keeps you under all caps.

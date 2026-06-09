# DropHunter — API & Environment Setup

This document lists **every environment variable** the app uses or will use for product hunting (trending feeds, marketplace search, suppliers, AI, and storage). Use it together with `.env.example` when setting up local or production environments.

**Copy template to start:**

```bash
cp .env.example .env
```

Never commit `.env` to git.

---

## Quick priority (what to add first)

| Priority | APIs | Env keys | Enables |
|----------|------|----------|---------|
| **P0 — Required** | MySQL, JWT | `DATABASE_URL`, `JWT_SECRET` | App runs, auth works |
| **P0b — Free catalogs (no key)** | DummyJSON, FakeStore, Shoptera | `FREE_RETAIL_ENABLED`, `SHOPTERA_ENABLED` | Real search without signup |
| **P1 — Live marketplace search** | eBay, SerpAPI, TikTok | See [Marketplace search](#marketplace-search) | Amazon/eBay/Google Shopping |
| **P2 — Trending & regions** | SerpAPI + eBay region config | `SERPAPI_*`, `EBAY_MARKETPLACE_ID`, `DEFAULT_REGION` | Trending by US/UK/EU |
| **P3 — AI features** | OpenAI-compatible | `OPENAI_API_KEY` | Validation, AI agent, social kit |
| **P4 — Suppliers** | CJ Dropshipping, AliExpress | `CJ_*`, `ALIEXPRESS_*` | Warehouses, ship-from, MOQ |
| **P5 — Optional** | S3, analytics, exchange rates | `S3_*`, `VITE_ANALYTICS_*`, `EXCHANGE_RATE_API_KEY` | Production storage, extras |

---

## Core application

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `NODE_ENV` | No | `development` | `development` or `production` |
| `PORT` | No | `3000` | HTTP server port |
| `DATABASE_URL` | **Yes** | — | MySQL connection string (matches `docker-compose.yml`) |
| `JWT_SECRET` | **Yes** | — | Session cookie signing (use a long random string in production) |
| `APP_ID` | No | `trendhunter` | Application identifier |

**Example:**

```env
DATABASE_URL=mysql://trendhunter:trendhunter@127.0.0.1:3306/trendhunter
JWT_SECRET=change-me-to-a-long-random-string
APP_ID=trendhunter
PORT=3000
NODE_ENV=development
```

---

## Free catalog search (no API key)

Use these while waiting for eBay / SerpAPI / AliExpress approval, or when SerpAPI quota is paused.

| Source | Cost | Signup | Env |
|--------|------|--------|-----|
| **DummyJSON** | Free | None | `FREE_RETAIL_ENABLED=true` (default) |
| **FakeStore API** | Free | None | Same |
| **Shoptera** | Free | None | `SHOPTERA_ENABLED=true` (default), 300 req/hr |

Also already free in your stack:

| Source | Cost | Notes |
|--------|------|-------|
| **Groq** | Free tier | `GROQ_API_KEY` — AI validate, agent, social kit |
| **CJ Dropshipping** | Free with account | `CJ_API_KEY` — supplier offers |

Optional free signup (not wired yet): [ProductSource](https://productsource.io) (500 lookups/mo), [BuyWhere](https://github.com/buywhere/buywhere) dev tier.

---

## Marketplace search

### eBay Browse API

**Docs:** [https://developer.ebay.com](https://developer.ebay.com)  
**Used for:** Product search, categories, marketplace-specific results (US, UK, DE, etc.)

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `EBAY_CLIENT_ID` | For live eBay | — | OAuth client ID |
| `EBAY_CLIENT_SECRET` | For live eBay | — | OAuth client secret |
| `EBAY_ENV` | No | `sandbox` | `sandbox` or `production` |
| `EBAY_MARKETPLACE_ID` | No | `EBAY_US` | Target marketplace (see table below) |

**Common `EBAY_MARKETPLACE_ID` values:**

| Region | Value |
|--------|--------|
| United States | `EBAY_US` |
| United Kingdom | `EBAY_GB` |
| Germany | `EBAY_DE` |
| Australia | `EBAY_AU` |
| Canada | `EBAY_CA` |

---

### SerpAPI (Amazon + Google Shopping + trends)

**Docs:** [https://serpapi.com](https://serpapi.com)  
**Used for:** Amazon product search, Google Shopping / retail, bestsellers, optional Google Trends

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `SERPAPI_KEY` | For live Amazon/Shopping | — | API key |
| `SERPAPI_AMAZON_DOMAIN` | No | `amazon.com` | Amazon locale (`amazon.co.uk`, `amazon.de`, …) |
| `SERPAPI_GOOGLE_COUNTRY` | No | `us` | Google Shopping country (`gl` param) |
| `SERPAPI_GOOGLE_LANGUAGE` | No | `en` | Google Shopping language (`hl` param) |

**Amazon domain examples:**

| Region | `SERPAPI_AMAZON_DOMAIN` |
|--------|-------------------------|
| US | `amazon.com` |
| UK | `amazon.co.uk` |
| Germany | `amazon.de` |
| France | `amazon.fr` |

---

### TikTok Shop

**Official docs:** [https://partner.tiktokshop.com](https://partner.tiktokshop.com)  
**Used for:** TikTok Shop product search and regional trending

**Option A — Official Partner API**

| Variable | Required | Purpose |
|----------|----------|---------|
| `TIKTOK_APP_KEY` | Yes (official) | App key |
| `TIKTOK_APP_SECRET` | Yes (official) | App secret |
| `TIKTOK_ACCESS_TOKEN` | Yes (official) | Shop access token |
| `TIKTOK_SHOP_CIPHER` | Yes (official) | Shop cipher |
| `TIKTOK_API_VERSION` | No | API version (default `202405`) |
| `TIKTOK_SHOP_REGION` | No | `US`, `UK`, `ID`, etc. |

**Option B — Third-party provider** (when official API unavailable)

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `TIKTOK_SHOP_PROVIDER` | No | `scrapecreators` | `scrapecreators` or `justoneapi` |
| `TIKTOK_SHOP_API_KEY` | Yes (third-party) | — | Provider API key |
| `TIKTOK_SHOP_API_BASE` | No | — | Custom provider base URL |

Use **either** Option A **or** Option B, not both.

---

## Product hunting — regions & trending (planned)

These variables support trending feeds, region tabs, and filter defaults. Implementation is phased; add them now so `.env` is ready.

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DEFAULT_REGION` | No | `US` | Default region on home / Discover (`US`, `UK`, `EU`, `GLOBAL`) |
| `SUPPORTED_REGIONS` | No | `US,UK,EU,GLOBAL` | Comma-separated regions shown in UI |
| `TRENDING_CACHE_TTL_HOURS` | No | `6` | Hours to cache trending snapshots |
| `TRENDING_MAX_ITEMS` | No | `40` | Max products per trending feed |

---

## Supplier & warehouse APIs (planned — Phase 4)

Inspired by AliExpress, CJ Dropshipping, and similar sourcing tools.

### CJ Dropshipping

**Docs:** [https://developers.cjdropshipping.com](https://developers.cjdropshipping.com)  
**Used for:** US/UK/CN warehouses, shipping methods, processing time, MOQ, landed cost

| Variable | Required | Purpose |
|----------|----------|---------|
| `CJ_API_KEY` | Yes | CJ API key |
| `CJ_API_BASE` | No | Default `https://developers.cjdropshipping.com/api2.0/v1` |
| `CJ_DEFAULT_WAREHOUSE` | No | Preferred warehouse (`US`, `UK`, `CN`) |

### AliExpress Open Platform

**Docs:** [https://openservice.aliexpress.com](https://openservice.aliexpress.com)  
**Used for:** CN sourcing, ship-from country, orders sold, delivery estimates

| Variable | Required | Purpose |
|----------|----------|---------|
| `ALIEXPRESS_APP_KEY` | Yes | App key |
| `ALIEXPRESS_APP_SECRET` | Yes | App secret |
| `ALIEXPRESS_ACCESS_TOKEN` | No | OAuth token (if using authorized endpoints) |
| `ALIEXPRESS_SHIP_FROM_DEFAULT` | No | Default ship-from filter (`CN`) |

---

## AI (validation, agent, social kit)

**Used for:** Product validation scores, AI research agent, hashtag/ad copy generation

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `OPENAI_API_KEY` | For AI features | — | API key |
| `OPENAI_API_BASE` | No | `https://api.openai.com/v1` | OpenAI-compatible base URL |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Default model |

Works with OpenAI, Azure OpenAI, or local Ollama (set `OPENAI_API_BASE` accordingly).

---

## File storage

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `UPLOADS_DIR` | No | `uploads` | Local upload folder when S3 is not set |
| `S3_BUCKET` | For S3 | — | Bucket name |
| `S3_REGION` | No | `us-east-1` | AWS region |
| `S3_ACCESS_KEY_ID` | For S3 | — | AWS access key |
| `S3_SECRET_ACCESS_KEY` | For S3 | — | AWS secret |
| `S3_PUBLIC_BASE_URL` | No | — | Public CDN/base URL for files |

If S3 is not configured, files are stored under `UPLOADS_DIR`.

---

## Frontend analytics (optional)

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_ANALYTICS_ENDPOINT` | No | Umami (or compatible) script URL |
| `VITE_ANALYTICS_WEBSITE_ID` | No | Website ID for analytics |

---

## Optional enhancements (later)

| Variable | Service | Purpose |
|----------|---------|---------|
| `EXCHANGE_RATE_API_KEY` | [exchangerate-api.com](https://www.exchangerate-api.com) or similar | Multi-currency price display |
| `RAINFOREST_API_KEY` | Rainforest API | Deeper Amazon product/history data |
| `KEEPA_API_KEY` | Keepa | Amazon price history |
| `GOOGLE_TRENDS_SERPAPI` | SerpAPI (same `SERPAPI_KEY`) | Keyword trend validation via Google Trends engine |

---

## Implementation TODO

Track progress sprint by sprint. Check items off as they ship.

### Sprint A — Foundation (types, filters, mock trending)

- [x] Extend `shared/searchTypes.ts` with region, category, warehouse, trend fields
- [x] Add `ProductHuntFilters` type (price, region, category, ship-from, sort, etc.)
- [x] Add DB migration: `trending_snapshots`, `product_offers`, `saved_filter_presets`
- [x] Implement `server/search/filters.ts` (server-side filter application)
- [x] Implement `server/search/normalize.ts` (provider → unified product shape)
- [x] Enhance `searchMock` with realistic trending demo (US/UK/CN warehouses)
- [x] Add `trpc.search.getFilterOptions` (categories, regions, ship-from list)
- [x] Build filter drawer UI on Search / Discover tab
- [x] Update `.env.example` and this doc when new vars are wired in code

### Sprint B — Trending on page load

- [x] Add `trpc.trending.getFeed` (public on home, protected on dashboard)
- [x] Add `trpc.trending.getRegions` / `getCategories`
- [x] Cache trending in `trending_snapshots` (`TRENDING_CACHE_TTL_HOURS`)
- [x] Home page: “Trending now” section with region tabs
- [x] Dashboard Search: default **Discover** tab before keyword search
- [x] **Env:** set `DEFAULT_REGION`, `SUPPORTED_REGIONS`

### Sprint C — Live marketplace + region filters

- [x] Pass region/category/price into eBay Browse API
- [x] **Env:** `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_MARKETPLACE_ID`
- [x] Pass `SERPAPI_AMAZON_DOMAIN`, `SERPAPI_GOOGLE_COUNTRY` into SerpAPI
- [x] **Env:** `SERPAPI_KEY` + region vars
- [x] Wire TikTok region (`TIKTOK_SHOP_REGION` or third-party key)
- [x] **Env:** TikTok Option A or Option B credentials
- [x] Verify US vs UK switch changes results and currency
- [x] Add provider status badges in UI (live vs demo)

### Sprint D — Supplier offers & shipping

- [x] Add `product_offers` table + `trpc.supplier.getOffersForProduct`
- [x] Integrate CJ Dropshipping API
- [x] **Env:** `CJ_API_KEY`, `CJ_API_BASE`, `CJ_DEFAULT_WAREHOUSE`
- [x] Integrate AliExpress Open Platform (or mock until keys ready)
- [x] **Env:** `ALIEXPRESS_APP_KEY`, `ALIEXPRESS_APP_SECRET`
- [x] Product detail UI: suppliers tab, shipping time, fees, MOQ
- [x] Pre-fill Profit Calculator from selected offer

### Sprint E — Organize & workflow

- [x] Extend watchlist/pipeline with supplier, region, landed cost
- [x] Saved filter presets (named searches)
- [x] Link trending product → Validate → Competitor spy → Pipeline
- [x] Analytics: discover → pipeline conversion metrics

### API keys checklist (your `.env`)

Copy this into your notes and tick when added:

**Core**
- [ ] `DATABASE_URL`
- [ ] `JWT_SECRET`

**Marketplace (Tier 1 — add first for real product data)**
- [ ] `EBAY_CLIENT_ID`
- [ ] `EBAY_CLIENT_SECRET`
- [ ] `SERPAPI_KEY`
- [ ] `SERPAPI_AMAZON_DOMAIN` (and `SERPAPI_GOOGLE_COUNTRY` if using UK/EU)
- [ ] TikTok: official (`TIKTOK_APP_KEY`, …) **or** third-party (`TIKTOK_SHOP_API_KEY`)

**AI**
- [ ] `OPENAI_API_KEY`

**Trending / regions (Sprint B+)**
- [ ] `DEFAULT_REGION`
- [ ] `SUPPORTED_REGIONS`

**Suppliers (Sprint D+)**
- [ ] `CJ_API_KEY`
- [ ] `ALIEXPRESS_APP_KEY` + `ALIEXPRESS_APP_SECRET`

**Production (optional)**
- [ ] `S3_BUCKET` + AWS keys
- [ ] `VITE_ANALYTICS_*`

---

## Where variables are read in code

| File | What it loads |
|------|----------------|
| `server/_core/env.ts` | All server-side API keys and config |
| `.env` | Local secrets (not committed) |
| `.env.example` | Template for developers |
| `client/*` | Only `VITE_*` variables (analytics) |

Supplier, trending, and region vars are centralized in `server/_core/env.ts` with startup validation in `server/_core/validateEnv.ts`.

---

## Testing without API keys

The app falls back to **demo/mock data** when marketplace keys are missing. You can still:

- Run auth, watchlist, pipeline, UI filters (Sprint A)
- Test full layout and workflows
- Add keys incrementally — each provider activates when its env vars are set

**Verify search providers:**

```bash
pnpm search:verify
```

---

## Security notes

1. Never commit `.env` or paste live keys in chat/issues.
2. Use `EBAY_ENV=sandbox` until production is ready.
3. Rotate `JWT_SECRET` if it was ever exposed.
4. Restrict API keys by IP/domain where the provider allows it.
5. CJ and AliExpress keys are server-only — never expose as `VITE_*`.

---

## Related files

| File | Description |
|------|-------------|
| `.env.example` | Copy-paste template with all variables |
| `server/search/index.ts` | Marketplace search orchestration |
| `server/search/ebay.ts` | eBay provider |
| `server/search/serpapi.ts` | Amazon + Google Shopping |
| `server/search/tiktok.ts` | TikTok Shop |
| `shared/searchTypes.ts` | Product and filter types |
| `docs/API-ENV-SETUP.md` | This document |

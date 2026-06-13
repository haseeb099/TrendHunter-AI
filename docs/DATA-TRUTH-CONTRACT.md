# Data Truth Contract

DropHunter / TrendHunter surfaces multiple data sources with explicit freshness labels. This document defines what each state means and where it appears in the product.

## Data states

| State | Meaning | UI label |
|-------|---------|----------|
| **live** | Fresh fetch from an external API on this request | Live |
| **cached** | Valid snapshot from DB within TTL | Cached |
| **stale** | Expired snapshot served because live was not called | Stale cache |
| **synthetic** | AI-generated content (no marketplace/API backing) | AI-generated |
| **estimated** | Heuristic or inferred ranking/listing values | Estimated |
| **missing** | Provider not configured or no data exists | Missing |
| **unavailable** | Legacy alias — resolves to **missing** in UI | Unavailable |

Resolution logic lives in `shared/searchTypes.ts` → `resolveDataState()`.

## Feature-by-feature contract

### Discover / Search (`search.searchProducts`, `trending.getFeed`)

- **Default:** cache-first from `search_snapshots`, `catalog_products`, or `trending_snapshots`.
- **Live toggle:** calls provider APIs; debits credits on success.
- **Stale:** expired trending/search snapshot when live APIs are skipped.
- **Trend score:** heuristic from `inferTrendScore()` in `server/search/normalize.ts`, optionally fused with Google Trends momentum and Meta ad saturation during daily ingest (`server/ingest/signalFusion.ts`).
- **Explainability:** `trendScoreInputs` on each product; `rankReason` on trending items.

### Supplier offers (`supplier.getOffersForProduct`)

- Cached `product_offers` rows (24h TTL per `OFFERS_CACHE_TTL_HOURS` default).
- Stale fallback when live supplier APIs fail.

### Intelligence — Google Trends (`intelligence.getTrendPulse`)

- Cached `trend_signals` within `TRENDING_CACHE_TTL_HOURS`.
- Live refresh: 1 credit.
- **Stale fallback:** expired row returned with `stale: true` on `TrendSignal`.

### Intelligence — Meta Ad Library (`intelligence.getAdRadar`)

- Cached `ad_library_snapshots` within TTL.
- Live refresh: 2 credits.
- **Stale fallback:** `stale: true` on `AdLibrarySnapshot`.

### Intelligence — TikTok (`intelligence.getTikTokRadar`)

- Cached `tiktok_ads_snapshots` within TTL.
- **Stale fallback:** `stale: true` on `TikTokAdsSnapshot`.

### Product validation (`validate.validateProduct`)

- **AI scores:** synthetic — LLM inference enriched with cached trend/ad context.
- **Market context badges:** cached intel with timestamps; may be stale.
- **Per-dimension reasoning:** `dimensionReasoning` explains each score field.

### Market Gap Finder (`marketgap.findGaps`)

- **Gap ideas:** synthetic (AI-generated suggestions, not live catalog).
- **Intel context:** cached Google Trends + Meta ads with `trendFetchedAt`, `adsFetchedAt`, stale flags.
- **Confidence:** `high` / `medium` / `low` — blends AI gap heuristics with intel coverage.

### Social Kit / Competitor Spy

- LLM output is synthetic unless live trends toggle is used (1 credit).
- Cached trend/ad reads are free.

## Provider transparency

`search.getProviderStatus` and `ProviderStatusBar` list configured search providers.

`system.getConfig.dataPlatform` reports SerpAPI, Meta, TikTok, and ingest status.

## Credits

Credits are charged **after** successful live fetches (search, trends, ads, validation live mode).

Cached reads are always free.

## Daily ingest

`scripts/ingest-daily.ts` (or `POST /api/ingest/daily`) refreshes:

- Trending snapshots (with signal fusion)
- Trend signals
- Ad library snapshots
- TikTok ad snapshots

`intelligence.getIngestStatus` exposes last run metadata for ops and the Data Coverage banner.

## UI components

| Component | Role |
|-----------|------|
| `DataFreshnessBadge` | Per-response state label + relative time |
| `DataCoverageBanner` | Intel pages — provider config + ingest freshness |
| `TrendScoreExplain` | Product cards/drawer — explain trend score inputs |
| `IntelligenceVerdict` | Plain-language opportunity readout with stale awareness |

## Enforcement checklist (beta launch)

- [x] Every live path debits credits only on success
- [x] Stale intel shows Stale cache badge, not Cached
- [x] AI features label output as AI-generated where applicable (validation, agent, market gap, social kit)
- [x] Empty states explain how to populate cache (ingest or live refresh) + zero-result recovery suggestions
- [x] No demo/mock data in production paths (`isDemo` deprecated)
- [x] Per-card `sourceProvider` provenance badge on ProductCard
- [x] Search tab shows `rankReason` / `rankingExplanation` parity with Discover
- [x] Drawer trust panels: why, delta, category winners, supplier confidence, competitor pressure, next moves

# DropHunter / TrendHunter — Sprint Roadmap

Phased delivery plan for production hardening. Each sprint is independently shippable.

> **Full project audit (bugs, gaps, S7–S22 roadmap):** [`PROJECT-AUDIT-AND-ROADMAP.md`](./PROJECT-AUDIT-AND-ROADMAP.md)

| Sprint | Theme | Status |
|--------|-------|--------|
| **S1** | Foundation & cleanup | Done |
| **S2** | Product & technical docs (PRD/TRD) | Done |
| **S3** | Flagged account enforcement | Done |
| **S4** | Stripe checkout + webhooks | Done |
| **S5** | Discount coupons + billing tests | Done |
| **S6** | Pipeline kanban drag-and-drop | Done |
| **S7** | Data platform: credits, cache-first search, daily ingest | Done |
| **S8** | Google Trends + Meta Ad Library + Social Kit 2.0 | Done |
| **S9** | Public trend pages + SEO / llms.txt | Done |
| **S10** | Polish: bugs, UI/UX, security, credits UX | Done |
| **S11** | Intelligence hub + Social Kit save/load + full kit | Done |
| **S12** | Intel Center sidebar + digest pages + UX polish | Done |
| **S13** | Category filters, keyword watches, email digest | Done |
| **S14** | Robustness & security hardening | Done |
| **S15** | Scale, SEO, TikTok intel, guest UX | Done |
| **S15.5** | Research engine pre-flight | Done |
| **S16** | Canonical product graph | Done |
| **S17** | Query expansion & discovery queue | Done |
| **S18** | Ranking engine v2 | Done |
| **S19** | Provider health & reliability | Done |
| **S20** | Category & regional coverage | Done |
| **S21** | Trust UX drawer panels | Done |
| **S22** | Learning loop (product events) | Done |
| **S23** | Research quality benchmarks | Done |
| **S24** | Ingest ops APIs | Done |
| **S25** | Agent search tool integration | Done |

> **Note:** [`PROJECT-AUDIT-AND-ROADMAP.md`](./PROJECT-AUDIT-AND-ROADMAP.md) Phase C sprints **S16–S18** (MRR dashboard, agent polish, Google OAuth) are a **parallel Business track** renamed **S16B–S18B** to avoid collision with Research Engine S16–S25.

---

## Sprint 13 — Alerts & category filters

**Goal:** Filter intel by category; notify users when keywords flip to rising; daily email digest.

**Deliverables:**
- Category chips on Intel Center (filters digest + trending products)
- `intel_keyword_watches` + rising alert emails (Resend) + in-app `intel_alert` events
- `intel_digest_prefs` + daily digest email after ingest
- `pnpm intel:alerts` script (also runs at end of daily ingest)

**Env:** `RESEND_API_KEY`, `EMAIL_FROM`, `INTEL_DIGEST_ENABLED`

---

## Sprint 12 — Market Intelligence Center (sidebar)

**Goal:** Centralize Google Trends, Meta Ads, and trending digest in dedicated left-nav pages — no external sites.

**Deliverables:**
- Sidebar group **Market Intelligence**: Intel Center, Google Trends, Meta Ad Library
- `getMarketDigest` API — rising keywords, meta hot, opportunities by region
- `IntelligenceVerdict` — plain-language opportunity readout
- Improved product drawer Intel tab with summary metrics + deep links

---

## Sprint 11 — Intelligence hub & Social Kit 2.1

**Goal:** Rich product intelligence panel; transparent LLM/credit limits; save/load social kits.

**Deliverables:**
- `ProductIntelligenceHub` — Overview, Google Trends, Meta Ads, TikTok angles (drawer + Social Kit page)
- `saved_social_kits` table + save/list/load/delete tRPC
- `generateFullKit` — one AI call for complete kit
- `SocialKitUsageBar` — AI quota, credits, saved kit limits
- Plan-based saved kit caps (Pro 30, Business 100, Agency unlimited)

**Social Kit metering:**
- Each individual generator = **1 AI call** (monthly quota per plan)
- **Full kit** = **1 AI call** total (recommended)
- Optional **live trends** = **1 credit** (hashtags / full kit with live toggle)
- Cached trend/ad reads are **free**

---

## Sprint 10 — Polish & hardening

**Goal:** Fix Sprint 7–9 rough edges; tighten public endpoints; improve credits and validation UX.

**Deliverables:**
- Public `/trends/:slug` uses `getPublicTrend` + `PublicTrendDisplay` (no auth)
- Live refresh fixes for Trend Pulse / Ad Radar (`utils.*.fetch` + wallet invalidation)
- Validation panel handles enriched API response + market context badges
- Keyword sanitization + rate limit on `getPublicTrend`
- `POST /api/ingest/daily` with `INGEST_SECRET` for manual ingest triggers
- Credits balance invalidation after live search; Billing unlimited credits display
- Data freshness badges on Home + Discover; intelligence shortcut on product cards
- `system.getConfig.dataPlatform` status block
- Tests: `shared/credits.test.ts`, `shared/keywordUtils.test.ts`, rate-limit regression

**Exit criteria:** `pnpm test` + `pnpm check` pass; public trends work without login.

---

## Sprint 7 — Data platform (credits + cache + ingest)

**Goal:** Users read cached DB data by default; live APIs cost credits; daily GitHub Actions ingest.

**Deliverables:**
- Credit wallet (`user_credits`, `credit_transactions`) per plan
- Cache-first `searchProducts` + `search_snapshots` + `catalog_products`
- `scripts/ingest-daily.ts` + `.github/workflows/daily-ingest.yml`
- Trending feed DB-only on page load

**Env:** `TRENDING_CACHE_TTL_HOURS=24`, `SERPAPI_DAILY_CAP`, `META_ADS_DAILY_CAP`, `META_ACCESS_TOKEN`

---

## Sprint 8 — Intelligence layer

**Goal:** Google Trends Trend Pulse + Meta Ad Radar in Discover, Validate, Competitors, Social Kit.

**Deliverables:**
- `trend_signals`, `ad_library_snapshots` tables
- `intelligence` tRPC router
- Trend Pulse + Ad Radar UI components
- Social Kit: hooks, 7-day calendar, SEO block

---

## Sprint 9 — SEO & public trends

**Goal:** Indexable public trend pages for search engines and LLM discovery.

**Deliverables:**
- `/trends/:slug` public page
- `client/public/llms.txt`, `robots.txt`
- Enhanced meta tags in `index.html`

---

## Sprint 1 — Foundation & dead code cleanup

**Goal:** Remove stale Manus template artifacts; align docs with local auth stack.

**Deliverables:**
- Remove `template.json`, `references/periodic-updates.md`, `client/public/__manus__/`, unused `Map.tsx`
- Rewrite `README.md` for DropHunter (Vite + Express + tRPC + MySQL)
- Update `todo.md` auth notes

**Exit criteria:** No Manus OAuth references in active code paths.

---

## Sprint 2 — PRD & TRD

**Goal:** Formal product and technical specifications for onboarding and architecture reviews.

**Deliverables:**
- [`docs/PRD.md`](./PRD.md) — personas, features, plan matrix, success metrics
- [`docs/TRD.md`](./TRD.md) — stack, routers, auth, billing, data model, deployment

**Exit criteria:** New engineers can onboard from docs without reading the whole codebase.

---

## Sprint 3 — Flagged account enforcement

**Goal:** `flagged` status restricts workspace (not cosmetic).

**Policy:** Flagged users may access **Billing** and **Account** only (same pattern as paused). Admins bypass.

**Deliverables:**
- `assertAccountUsable()` blocks flagged on `protectedProcedure`
- `usePlan` + `Dashboard` redirect flagged users to billing
- Warning banner with `flagReason` when present

**Exit criteria:** Flagged user cannot call search/AI/pipeline APIs; can still manage account and billing.

---

## Sprint 4 — Stripe checkout & webhooks

**Goal:** Paid upgrades via Stripe Checkout; no free DB plan grants when Stripe is configured.

**Deliverables:**
- `stripe` SDK + env vars in `server/_core/env.ts`
- `POST /api/webhooks/stripe` (raw body, signature verification)
- `billing.createCheckoutSession`, `billing.createPortalSession`
- Webhook handlers: `checkout.session.completed`, `customer.subscription.updated/deleted`
- Idempotency table `stripe_webhook_events`
- Billing UI redirects to Checkout when Stripe configured

**Env vars:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_*`, `APP_URL`

**Exit criteria:** Checkout → webhook → user `planId` + `stripeSubscriptionId` updated; `selectPlan` blocked when Stripe active.

---

## Sprint 5 — Discount coupons & admin/billing tests

**Goal:** `discount_percent` coupons create Stripe promotion codes; regression tests for billing/admin.

**Deliverables:**
- `coupon_redemptions.stripePromotionCodeId` column
- Redeem flow creates Stripe promotion code when configured
- Checkout auto-applies user's active discount redemption
- `server/billing.test.ts`, `server/admin.test.ts`, extended `plans.test.ts`

**Exit criteria:** Vitest covers selectPlan gating, coupon redemption, flagged assertion, Stripe config helpers.

---

## Sprint 6 — Pipeline kanban DnD

**Goal:** Drag cards between columns; persist via existing `updatePipelineItem`.

**Deliverables:**
- `@dnd-kit/core` + `@dnd-kit/utilities` on `ProductPipeline.tsx`
- Optimistic stage update on drop
- Keep Select fallback on cards for accessibility

**Exit criteria:** Drag card Testing → Scaling updates DB stage; keyboard users can still use Select.

---

## Enabling production billing

1. Set Stripe env vars (see `.env.example` and `docs/API-ENV-SETUP.md`)
2. Create Products/Prices in Stripe Dashboard; map to `STRIPE_PRICE_*`
3. Register webhook: `https://your-domain/api/webhooks/stripe`
4. Admin → Settings → **Self-serve billing** ON
5. For local webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

**Beta without Stripe:** Self-serve ON + Stripe unset = manual `selectPlan` (admin/coupon upgrades only).

---

## Sprint 14 — Robustness & security hardening

**Goal:** Fix credit/billing race conditions, close maintenance bypass, tighten public API limits, polish intel UX.

**Deliverables:**
- Charge credits **after** successful live search / trends / validation / competitor / social fetches
- Atomic credit debit (`balance >= cost` in SQL `WHERE`)
- `protectedBase` enforces maintenance mode (search, AI, pipeline)
- Rate limit on public `trending.getFeed` (120 req/min/IP)
- Reduce global JSON body limit to 2MB
- `saveKit` gated on `social` plan + 500KB payload cap
- Error boundary hides stack traces in production
- Intel Center opens `ProductDetailDrawer` on product cards
- Mobile sidebar closes on nav; drawer tabs 3-col on small screens
- Competitor Spy auto-analyzes `?keyword=` deep links
- Intel pages show query error alerts
- `DashboardTabId` consolidated to `@shared/plans`
- `.env.example` cleanup; remove broken `sitemap.xml` from `robots.txt`

**Exit criteria:** `pnpm check` + `pnpm test` pass; credits not charged on failed live fetches; maintenance blocks workspace APIs.

---

## Sprint 15 — Scale, SEO, TikTok intel, guest UX

**Goal:** Production-scale rate limits, SEO sitemap, Social Kit AI cache, TikTok Ad Library, guest-safe product drawer.

**Deliverables:**
- Redis-backed rate limiting (`REDIS_URL`) with in-memory fallback
- Dynamic `/sitemap.xml` from cached trend keywords + `robots.txt` restored
- `ai_output_cache` wired to all Social Kit LLM mutations (7-day TTL)
- TikTok Ad Library via `SEARCHAPI_KEY` + ScrapeCreators organic fallback
- `tiktok_ads_snapshots` table + ingest + `getTikTokRadar` API
- Guest home drawer uses `getPublicTrend` (no auth-only APIs)

**Exit criteria:** `pnpm check` + `pnpm test` pass; `pnpm db:migrate` through `0012`.

---

## Sprint 15.5 — Research engine pre-flight

**Goal:** Harden cache-first search and daily ingest before building the autonomous research pipeline.

**Deliverables:**
- Cache-first `searchProducts` with stale fallback and live credit gating ([`server/search/index.ts`](../server/search/index.ts))
- Daily ingest orchestrator with retry queue ([`server/ingest/daily.ts`](../server/ingest/daily.ts))
- `SERPAPI_DAILY_CAP`, `DISCOVERY_QUEUE_*` env knobs in [`server/_core/env.ts`](../server/_core/env.ts)

**Exit criteria:** Ingest runs without live keys; search returns cached results when live fails.

---

## Sprint 16 — Canonical product graph

**Goal:** Deduplicate multi-provider listings into canonical products for stable ranking and delta tracking.

**Deliverables:**
- Migration `0015_product_graph.sql` — `canonical_products`, `product_listings`
- [`server/dataPlatform/productGraph.ts`](../server/dataPlatform/productGraph.ts) — title normalization, Jaccard dedupe, price bands
- Unit tests in [`server/dataPlatform/productGraph.test.ts`](../server/dataPlatform/productGraph.test.ts)

**Exit criteria:** Same product from eBay + SerpAPI merges to one canonical ID.

---

## Sprint 17 — Query expansion & discovery queue

**Goal:** Autonomous overnight discovery from trends, ads, and user behavior — not just manual search.

**Deliverables:**
- Migration `0016_research_engine.sql` — `discovery_queue`, `product_features`, `ingest_retries`, `ranking_configs`, `trending_snapshot_diffs`
- [`server/discovery/queryExpansion.ts`](../server/discovery/queryExpansion.ts) — rising keywords, synonym variants, adjacent queries
- [`server/discovery/keywordLinker.ts`](../server/discovery/keywordLinker.ts) — title → trend keyword linking
- Tests in [`server/discovery/queryExpansion.test.ts`](../server/discovery/queryExpansion.test.ts)

**Env:** `DISCOVERY_QUEUE_MAX_PER_RUN`, `DISCOVERY_QUEUE_PRIORITY_MIN`

**Exit criteria:** Daily ingest enqueues and processes discovery queries; queue depth visible via ingest status API.

---

## Sprint 18 — Ranking engine v2

**Goal:** Replace opaque trend fusion with a 10-signal decision engine and explainable scores.

**Deliverables:**
- [`server/ranking/scoreProduct.ts`](../server/ranking/scoreProduct.ts) — weighted signals, `rankingExplanation`, config table fallback
- [`server/ranking/features.ts`](../server/ranking/features.ts) — materialized `product_features`
- [`server/ranking/robustness.ts`](../server/ranking/robustness.ts) + tests — query synonym stability
- [`client/src/components/intelligence/TrendScoreExplain.tsx`](../client/src/components/intelligence/TrendScoreExplain.tsx) — score popover on Search + Discover
- `rankReason` on trending feed ([`server/trending/rankReason.ts`](../server/trending/rankReason.ts))

**Env:** `RANKING_VERSION=v2` (default; set `v1` for legacy fusion)

**Exit criteria:** Products show top signals + confidence tier; admin can inspect score breakdown.

---

## Sprint 19 — Provider health & reliability

**Goal:** Circuit-break degraded providers; retry failed ingest steps without losing queue state.

**Deliverables:**
- [`server/_core/providerHealth.ts`](../server/_core/providerHealth.ts) — Redis-backed circuit breaker with in-memory fallback
- [`server/ingest/ingestRetries.ts`](../server/ingest/ingestRetries.ts) — `ingest_retries` table + processor
- [`client/src/components/intelligence/ProviderStatusBar.tsx`](../client/src/components/intelligence/ProviderStatusBar.tsx) — degraded provider banner
- Tests in [`server/_core/providerHealth.test.ts`](../server/_core/providerHealth.test.ts)

**Env:** `REDIS_URL` (recommended prod), `HEALTH_PROBE_EXTERNAL=true` for deep probes

**Exit criteria:** Repeated provider failures open circuit; ingest retries drain on next run.

---

## Sprint 20 — Category & regional coverage

**Goal:** Category-aware provider routing and EU/GLOBAL ingest alongside US/UK.

**Deliverables:**
- [`server/search/categories.ts`](../server/search/categories.ts) — category inference + provider priority
- `ENV.supportedRegions` from `SUPPORTED_REGIONS` (US, UK, EU, GLOBAL)
- EU/GLOBAL daily ingest paths in [`server/ingest/daily.ts`](../server/ingest/daily.ts)
- Tests in [`server/search/categories.test.ts`](../server/search/categories.test.ts)

**Exit criteria:** Discover returns region-appropriate results; category chips filter provider mix.

---

## Sprint 21 — Trust UX drawer panels

**Goal:** Product drawer explains *why* a product ranks, what changed, and what to do next.

**Deliverables:**
- Six trust panels in [`client/src/components/product-workspace/`](../client/src/components/product-workspace/):
  - `ProductWhyPanel` — ranking explanation summary
  - `NextMovesPanel` — actionable recommendations ([`server/ranking/nextMoves.ts`](../server/ranking/nextMoves.ts))
  - `ProductDeltaPanel` — snapshot diff since last ingest
  - `CompetitorPressurePanel`, `CategoryWinnersPanel`, `SupplierConfidencePanel`
- [`client/src/components/intelligence/DataCoverageBanner.tsx`](../client/src/components/intelligence/DataCoverageBanner.tsx) + `DataFreshnessBadge`
- Wired into [`ProductDetailDrawer.tsx`](../client/src/components/ProductDetailDrawer.tsx)

**Exit criteria:** Drawer tabs load without auth-only gaps; synthetic vs live badges per [`DATA-TRUTH-CONTRACT.md`](./DATA-TRUTH-CONTRACT.md).

---

## Sprint 22 — Learning loop (product events)

**Goal:** Capture user product interactions to improve discovery query expansion.

**Deliverables:**
- `product_click`, `product_view`, `watchlist_add` events in `user_events` ([`server/db.ts`](../server/db.ts))
- [`client/src/_core/hooks/useProductAnalytics.ts`](../client/src/_core/hooks/useProductAnalytics.ts) + [`ProductCard.tsx`](../client/src/components/ProductCard.tsx) tracking
- Query expansion reads click history ([`server/discovery/queryExpansion.ts`](../server/discovery/queryExpansion.ts))

**Exit criteria:** Clicked products influence next discovery queue batch.

---

## Sprint 23 — Research quality benchmarks

**Goal:** Admin scorecard + competitor positioning doc for research engine quality.

**Deliverables:**
- [`server/ranking/researchQuality.ts`](../server/ranking/researchQuality.ts) — zero-result rate, coverage, robustness metrics
- [`client/src/pages/admin/AdminResearchQualityTab.tsx`](../client/src/pages/admin/AdminResearchQualityTab.tsx) — admin scorecard at `/admin/research-quality`
- [`docs/COMPETITOR-BENCHMARK.md`](./COMPETITOR-BENCHMARK.md) — positioning vs typical research tools

**Exit criteria:** Admin sees research quality metrics without SQL; benchmark doc published.

---

## Sprint 24 — Ingest ops APIs

**Goal:** Operators monitor and trigger ingest without SSH or cron guesswork.

**Deliverables:**
- [`server/_core/ingestRoutes.ts`](../server/_core/ingestRoutes.ts):
  - `POST /api/ingest/daily` — manual trigger (requires `INGEST_SECRET`)
  - `GET /api/ingest/status` — queue depth, last run, retry counts, provider health
- [`server/ingest/snapshotDiff.ts`](../server/ingest/snapshotDiff.ts) — trending snapshot diffs
- [`server/dataPlatform/snapshotDiff.ts`](../server/dataPlatform/snapshotDiff.ts)

**Env:** `INGEST_SECRET`

**Exit criteria:** Ops can trigger ingest and read status via HTTP; GitHub Actions daily workflow unchanged.

---

## Sprint 25 — Agent search tool integration

**Goal:** AI agent can search products from chat with the same ranking explainability as the workspace.

**Deliverables:**
- `searchProductsTool` in [`server/routers.ts`](../server/routers.ts) — agent tool calling for product search
- Responses include `sourceUrl` + `rankingExplanation.summary` where available
- Discover feed and Search tab share rank reason + trend score explain components

**Exit criteria:** Agent returns ranked product summaries; Search/Discover show consistent explainability.

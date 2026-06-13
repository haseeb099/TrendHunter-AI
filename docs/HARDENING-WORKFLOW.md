# Launch Hardening Workflow

Phased Cursor workflow for TrendHunter-AI. Run **one phase per chat**; @-mention the rule file or paste the starter prompt below.

**Authoritative docs:** [`PRD.md`](PRD.md) · [`TRD.md`](TRD.md) · [`DATA-TRUTH-CONTRACT.md`](DATA-TRUTH-CONTRACT.md) · [`LAUNCH-CHECKLIST.md`](LAUNCH-CHECKLIST.md) · [`STRIPE-SETUP.md`](STRIPE-SETUP.md) · [`LAUNCH-AUDIT-2026-06.md`](LAUNCH-AUDIT-2026-06.md)

**Full pass:** @-mention `@99-master-orchestrator.mdc` only after domain phases, or run phases 1–15 sequentially.

---

## Already resolved (June 2026 — verify, do not re-fix)

| ID | Area | Status |
|----|------|--------|
| C-01 | `scoreProduct.ts` — non-live trending intel fetches | **Fixed** — `fetchLiveIntel` gate |
| C-02 | `validateEnv.ts` — `STRIPE_PRICE_*` startup validation | **Fixed** |
| C-03 | `stripeWebhooks.ts` — `discount_percent` coupon consumption | **Fixed** |
| C-04 | `credits/index.ts` — credit idempotency scan | **Fixed** — indexed `stripeSessionId` |
| M-01 | `shared/ranking.ts` — demand persistence duplicate | **Fixed** |
| M-02 | `adminRouter.ts` — ranking weights normalization | **Fixed** |
| M-03 | `docker-compose.prod.yml` — credit pack Stripe env | **Fixed** |
| M-04 | Expired trial API access | **Verified** — `assertSubscriptionActive` |

Open gaps: L-01 (`self_serve_billing` default off), L-02 (client guards UX-only), L-03 (Redis optional), L-04 (optional providers → Missing UI).

**Notion sync (June 13):** See `docs/NOTION-IMPLEMENTATION-PLAN.md`, `docs/CODE-QUALITY-ROADMAP.md`, `docs/PRODUCTION-READINESS.md`, `docs/LAUNCH-WEEK-OPS.md`.

---

## Phase 1 — Full repo audit

| | |
|---|---|
| **Rule** | `@01-audit.mdc` |
| **Paths** | `server/_core/`, `server/billingRouter.ts`, `server/stripeWebhooks.ts`, `server/credits/`, `server/ranking/`, `server/adminRouter.ts`, `client/src/pages/admin/` |
| **Verify** | `pnpm check` |
| **Output** | `docs/LAUNCH-AUDIT-YYYY-MM.md` with severity table |

**Starter prompt:**
```
Audit TrendHunter-AI vs docs/PRD.md and docs/TRD.md. Use @01-audit.mdc.
Output severity table: ID | Path | Issue | Why | Fix. Skip C-01..C-04 and M-01..M-04 (already fixed per LAUNCH-AUDIT-2026-06.md). Audit only — no code changes.
```

---

## Phase 2 — Truthfulness layer

| | |
|---|---|
| **Rule** | `@02-truthfulness.mdc` |
| **Paths** | `shared/searchTypes.ts`, `server/search/truthLabels.ts`, `server/truthMode.ts`, `client/src/components/ProductCard.tsx`, intel panels |
| **Verify** | `pnpm test server/ranking/scoreProduct.test.ts` |
| **Output** | List surfaces missing labels or `rankingExplanation.signalsMissing` |

**Starter prompt:**
```
Harden data truth labels per @02-truthfulness.mdc and docs/DATA-TRUTH-CONTRACT.md.
Audit ProductCard, SupplierConfidencePanel, ProductValidationPanel, AdRadarPanel, TrendScoreExplain.
Ensure estimated/missing states never read as live. No heuristic presented as live data.
```

---

## Phase 3 — Ranking engine

| | |
|---|---|
| **Rule** | `@03-ranking.mdc` |
| **Paths** | `server/ranking/scoreProduct.ts`, `shared/ranking.ts`, `server/ingest/trendingRefresh.ts`, `server/adminRouter.ts` |
| **Verify** | `pnpm test server/ranking/scoreProduct.test.ts server/ranking/robustness.test.ts` |
| **Output** | Math-safety fixes + test additions |

**Starter prompt:**
```
Review ranking per @03-ranking.mdc. Check divide-by-zero, activeWeights denominator, isTrending threshold (≥70), confidence calc.
Trending page load must NOT call external intel APIs (C-01 resolved — verify gate). Add edge-case tests if gaps found.
```

---

## Phase 4 — Stripe billing

| | |
|---|---|
| **Rule** | `@04-stripe-billing.mdc` |
| **Paths** | `server/stripeWebhooks.ts`, `server/billingRouter.ts`, `server/coupons.ts`, `server/stripeRoutes.ts` |
| **Verify** | `pnpm test server/stripeWebhooks.test.ts server/billing.test.ts server/coupons.test.ts` |
| **Output** | Webhook path fixes; metadata audit |

**Starter prompt:**
```
Harden Stripe per @04-stripe-billing.mdc and docs/STRIPE-SETUP.md.
Verify checkout.session.completed, subscription.updated/deleted, invoice.payment_succeeded (renewals), invoice.payment_failed, past_due → expired.
Metadata: userId, planId, type, packId, credits. C-03/C-04 resolved — verify only.
```

---

## Phase 5 — Entitlements & gating

| | |
|---|---|
| **Rule** | `@05-entitlements.mdc` |
| **Paths** | `server/_core/planMiddleware.ts`, `server/routers.ts`, `shared/plans.ts`, `client/src/components/workspace/PlanFeatureGate.tsx` |
| **Verify** | `pnpm test server/plans.test.ts` |
| **Output** | Procedure→router matrix gaps |

**Starter prompt:**
```
Audit entitlements per @05-entitlements.mdc. Every paid feature uses protectedBase or derivatives.
Cover plans: trial/starter/pro/business/agency; states: active/expired/cancelled/paused/flagged/deactivated.
M-04 verified — confirm expired trial blocked at protectedBase.
```

---

## Phase 6 — Admin console

| | |
|---|---|
| **Rule** | `@06-admin.mdc` |
| **Paths** | `server/adminRouter.ts`, `client/src/pages/admin/*.tsx`, `client/src/pages/AdminDashboard.tsx` |
| **Verify** | `pnpm test server/admin.test.ts` |
| **Output** | Missing confirmations or audit gaps |

**Starter prompt:**
```
Harden admin per @06-admin.mdc. All mutations via adminProcedure + audit() log.
Require confirmations: delete user, demote admin, ranking config change, global settings, expire plan.
Tabs: Dashboard, Activity, Research Quality, Ranking Config, Plans, Revenue, Coupons, Settings.
```

---

## Phase 7 — Credits system

| | |
|---|---|
| **Rule** | `@07-credits.mdc` |
| **Paths** | `server/credits/index.ts`, `shared/credits.ts`, `server/creditsRouter.ts`, `drizzle/schema.ts` (`credit_transactions`) |
| **Verify** | `pnpm test server/credits/credits.test.ts shared/credits.test.ts` |
| **Output** | Ledger + idempotency fixes |

**Starter prompt:**
```
Harden credits per @07-credits.mdc. Deduct only after successful live fetch. credit_transactions ledger must balance.
Stripe pack grant idempotent by stripeSessionId (C-04 resolved). Test concurrent live-call idempotency.
```

---

## Phase 8 — Provider resilience

| | |
|---|---|
| **Rule** | `@08-providers-caching.mdc` (Providers section) |
| **Paths** | `server/intelligence/providers.ts`, `server/search/providerRegistry.ts`, `server/search/liveSearch.ts`, `server/dataPlatform/providerBudget.ts` |
| **Verify** | `pnpm test server/search/providerRegistry.test.ts server/dataPlatform/providerBudget.test.ts` |
| **Output** | Timeout/retry/budget fixes |

**Starter prompt:**
```
Harden providers per @08-providers-caching.mdc Providers section.
Partial failure → Missing indicators, not poisoned cache. Log provider name, latency, error class.
Run pnpm verify:all-providers if keys configured.
```

---

## Phase 9 — Data freshness & caching

| | |
|---|---|
| **Rule** | `@08-providers-caching.mdc` (Freshness section) |
| **Paths** | `server/_core/env.ts`, `server/search/truthLabels.ts`, `server/trending/index.ts`, `client/src/components/intelligence/DataFreshnessBadge.tsx` |
| **Verify** | `pnpm test server/trending.test.ts` |
| **Output** | TTL alignment with DATA-TRUTH-CONTRACT |

**Starter prompt:**
```
Harden caching per @08-providers-caching.mdc Freshness section and docs/DATA-TRUTH-CONTRACT.md.
Every cached object: fetchedAt, expiresAt/stale, source. Trending page DB-only on load.
Cached reads free; live reads debit credits on success only.
```

---

## Phase 10 — Search & discovery UX

| | |
|---|---|
| **Rule** | `@11-discovery-ux.mdc` |
| **Paths** | `client/src/pages/ProductSearch.tsx`, `IntelligenceCenter.tsx`, `MarketGapFinder.tsx`, `CompetitorSpy.tsx`, `ProductCard.tsx`, `EmptyState.tsx` |
| **Verify** | Manual UI pass + `pnpm check` |
| **Output** | UX gaps list |

**Starter prompt:**
```
Improve discovery UX per @11-discovery-ux.mdc.
Cards: score, confidence, freshness, live/cached, top signals, signalsMissing.
Empty states: no results, no live data, no provider access. No fake data when provider Missing.
```

---

## Phase 11 — Performance & indexes

| | |
|---|---|
| **Rule** | `@09-quality-bar.mdc` |
| **Paths** | `drizzle/schema.ts`, `drizzle/0027_launch_hardening_indexes.sql`, hot query paths in `server/db.ts` |
| **Verify** | `pnpm db:migrate` (dry run) · `pnpm build` |
| **Output** | Index/query recommendations |

**Starter prompt:**
```
Review perf per @09-quality-bar.mdc. Indexes: stripe_webhook_events.eventId, credit_transactions.stripeSessionId, admin_audit_log.createdAt, user plan filters.
Confirm migration 0027_launch_hardening_indexes.sql applied before prod.
```

---

## Phase 12 — Security

| | |
|---|---|
| **Rule** | `@12-security.mdc` |
| **Paths** | `server/_core/session.ts`, `server/_core/rateLimit.ts`, `server/adminRouter.ts`, `server/stripeRoutes.ts`, `server/ingestRoutes.ts` |
| **Verify** | `pnpm test server/_core/rateLimit.test.ts server/auth.test.ts` |
| **Output** | Severity: critical / high / medium |

**Starter prompt:**
```
Security audit per @12-security.mdc. Auth/session, adminProcedure, webhook signature verification, Zod on tRPC inputs.
Rate limits (REDIS_URL for multi-instance), Helmet, ingest cron secret, no secrets in client bundle.
```

---

## Phase 13 — Error UX

| | |
|---|---|
| **Rule** | `@13-error-ux.mdc` |
| **Paths** | `shared/const.ts`, `client/src/lib/trpcErrors.ts`, `client/src/components/ErrorBoundary.tsx` |
| **Verify** | Manual trigger of PLAN_FORBIDDEN, SUBSCRIPTION_INACTIVE, provider errors |
| **Output** | Copy + retry/billing CTA gaps |

**Starter prompt:**
```
Harden error UX per @13-error-ux.mdc. Map tRPC codes to actionable copy in shared/const.ts and trpcErrors.ts.
Required states: loading, retry, empty, permission denied, quota exceeded, provider unavailable.
Billing CTA on entitlement errors.
```

---

## Phase 14 — Testing suite

| | |
|---|---|
| **Rule** | `@14-testing.mdc` |
| **Paths** | `**/*.test.ts`, `vitest.config.ts`, `scripts/e2e-api-test.ts` |
| **Verify** | `pnpm test` · `pnpm test:e2e` · `pnpm test:launch` · `pnpm check` |
| **Output** | New behavior tests for gaps |

**Starter prompt:**
```
Expand tests per @14-testing.mdc. Priority: auth flows, duplicate webhooks, concurrent credits, stale cache, admin destructive actions.
Prefer behavior tests. Run pnpm test && pnpm test:e2e before marking phase done.
```

---

## Phase 15 — Launch readiness

| | |
|---|---|
| **Rule** | `@10-launch-readiness.mdc` |
| **Paths** | `docs/LAUNCH-CHECKLIST.md`, `docs/STRIPE-SETUP.md`, `docs/DOCKER-DEPLOY.md`, `.env.example` |
| **Verify** | `pnpm build` · `pnpm test:e2e` · checklist walkthrough |
| **Output** | Updated checklist + remaining risks |

**Starter prompt:**
```
Final launch check per @10-launch-readiness.mdc and docs/LAUNCH-CHECKLIST.md.
Env, Stripe live webhook, admin self_serve_billing, db:migrate (0027), docker prod smoke.
Update docs/PROJECT-AUDIT-AND-ROADMAP.md with final status.
```

---

## Quick reference

| Phase | Rule | Verify command |
|-------|------|----------------|
| 1 Audit | `@01-audit.mdc` | `pnpm check` |
| 2 Truth | `@02-truthfulness.mdc` | `pnpm test server/ranking/scoreProduct.test.ts` |
| 3 Ranking | `@03-ranking.mdc` | `pnpm test server/ranking/` |
| 4 Stripe | `@04-stripe-billing.mdc` | `pnpm test server/stripeWebhooks.test.ts server/billing.test.ts` |
| 5 Entitlements | `@05-entitlements.mdc` | `pnpm test server/plans.test.ts` |
| 6 Admin | `@06-admin.mdc` | `pnpm test server/admin.test.ts` |
| 7 Credits | `@07-credits.mdc` | `pnpm test server/credits/` |
| 8 Providers | `@08-providers-caching.mdc` | `pnpm test server/search/providerRegistry.test.ts` |
| 9 Freshness | `@08-providers-caching.mdc` | `pnpm test server/trending.test.ts` |
| 10 Discovery UX | `@11-discovery-ux.mdc` | `pnpm check` |
| 11 Perf | `@09-quality-bar.mdc` | `pnpm build` |
| 12 Security | `@12-security.mdc` | `pnpm test server/auth.test.ts` |
| 13 Error UX | `@13-error-ux.mdc` | manual |
| 14 Tests | `@14-testing.mdc` | `pnpm test && pnpm test:e2e` |
| 15 Launch | `@10-launch-readiness.mdc` | `pnpm build && pnpm test:launch` |

# Launch Audit — June 2026

> **Implemented and updated by Cursor** — June 13, 2026 (Notion sync)

Prioritized audit of TrendHunter-AI vs `docs/PRD.md` / live code. **Audit only** — fixes tracked in launch hardening phases.

**Re-verified:** June 13, 2026 — Notion project hub sync + B-02/B-06 lifecycle fixes.

## Critical blockers (resolved or mitigated in this pass)

| ID | Path | Issue | Status |
|----|------|-------|--------|
| C-01 | `server/ranking/scoreProduct.ts` | Non-live trending re-score triggered intel API fetches | **Fixed** — `fetchLiveIntel` gate (default false) |
| C-02 | `server/_core/validateEnv.ts` | `STRIPE_PRICE_*` not validated at startup | **Fixed** — production requires all price IDs |
| C-03 | `server/stripeWebhooks.ts` | `discount_percent` coupons not consumed post-checkout | **Fixed** — `checkoutConsumedAt` + webhook mark |
| C-04 | `server/credits/index.ts` | Credit idempotency scanned last 200 rows | **Fixed** — indexed `stripeSessionId` column |

## Major bugs (addressed)

| ID | Path | Issue | Status |
|----|------|-------|--------|
| M-01 | `shared/ranking.ts` | Demand persistence duplicated momentum | **Fixed** — separate `demandPersistenceScore` |
| M-02 | `server/adminRouter.ts` | Ranking weights not normalized on save | **Fixed** — `normalizeRankingWeights` |
| M-03 | `docker-compose.prod.yml` | Missing credit pack Stripe price env | **Fixed** |
| M-04 | B-01 expired trial API access | `protectedBase` → `assertSubscriptionActive` | **Verified fixed** in `planMiddleware.ts` |

## Launch gaps (document / ops)

| ID | Issue | Recommendation |
|----|-------|----------------|
| L-01 | `self_serve_billing` defaults **false** in `planCatalog.ts` | Admin must enable before public checkout |
| L-02 | Client route guards are UX-only | Server procedures are authoritative (by design) |
| L-03 | `REDIS_URL` optional — rate limits per-instance | Set Upstash Redis for multi-instance prod |
| L-04 | Many intel providers optional | Configure per `docs/API-ENV-SETUP.md`; UI shows Missing/Estimated states |

## Nice-to-haves (post-launch)

- Agency multi-client workspaces (PRD non-goal)
- White-label export (PRD non-goal)
- Native mobile (PRD non-goal)
- Broader E2E browser automation beyond `scripts/e2e-api-test.ts`

## Test coverage gaps (partially closed)

- Auth login/register — `server/auth.test.ts`
- Webhook dedup + subscription checkout — `server/stripeWebhooks.test.ts`
- Credits — `server/credits/credits.test.ts`
- Ranking edge cases — `server/ranking/scoreProduct.test.ts`
- Plan matrix — extended `server/plans.test.ts`
- Client error UX — `client/src/lib/trpcErrors.test.tsx`

## Minor fixes (June 12–13 hardening pass)

| ID | Path | Issue | Status |
|----|------|-------|--------|
| N-01 | `SupplierConfidencePanel.tsx` | Missing freshness badge, loading/error states | **Fixed** |
| N-02 | `trpcErrors.ts` | Account-state + login errors lacked actionable copy | **Fixed** |
| B-02 | `server/_core/index.ts`, `server/plans.ts` | Trial expiry only on startup | **Fixed** — hourly cron + lazy expiry |
| B-06 | `server/plans.ts` | expireStaleTrials left planId=trial | **Fixed** — sets planId=starter on expiry |
| S9 | `server/notifications/lifecycleEmails.ts` | No lifecycle emails | **Scaffold** — welcome, trial ending, payment failed |

## CI

`.github/workflows/ci.yml` runs `pnpm check` and `pnpm test` on push/PR.

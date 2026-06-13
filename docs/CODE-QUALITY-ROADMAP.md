# Code Quality & Improvement Roadmap

> **Implemented and updated by Cursor** — synced from Notion doc 17, June 13, 2026  
> Source: [📋 17 — Code Quality & Improvement Roadmap](https://app.notion.com/p/37edd43e0a9d81dc865ecf461f982631)

Comprehensive analysis and improvement roadmap for TrendHunter-AI based on June 13, 2026 audit. Target: post-launch sprints S26+.

---

## Current strengths

### Architecture & code quality

- **Type-safe monorepo**: 100% TypeScript across client, server, and shared layers
- **tRPC procedure ladder**: Clean authorization gating from public → authenticated → protected → admin
- **Database normalization**: 24 MySQL tables with proper foreign keys, indexes, and cascade rules
- **Error boundary architecture**: Centralized `trpcErrors` with structured error messages for UI consumption
- **Idempotent webhooks**: Stripe webhook handler deduplicates by event ID with database-enforced uniqueness
- **Structured logging**: JSON logs in production via `server/_core/logger.ts`

### Test coverage

- **211+ unit tests**: Auth, billing, credits, ranking, and error handling covered
- **CI/CD pipeline**: GitHub Actions on every push — fast feedback loop
- **Test patterns**: Mocking (Stripe, API providers), isolated DB state per test

### Feature completeness

- **MVP+ scope**: 20 modules shipped across research, validation, and pipeline workflows
- **Plan gating**: 3 tiers with per-feature entitlements enforced server-side
- **Admin panel**: Full workspace, user, plan, coupon, and audit management

---

## Technical debt & gaps

### Priority 1: Security (S26–S27)

| Item | Risk | Fix | Effort |
|------|------|-----|--------|
| No email verification on signup | Account takeover via typo | OTP email post-register | 2 days |
| Missing 2FA support | Account compromise | TOTP via speakeasy + recovery codes | 4 days |
| Rate limits in-memory default | Brute-force auth | Set `REDIS_URL` for clustering | Ops |
| JWT token rotation not implemented | Long-lived token compromise | Refresh token rotation | 2 days |

### Priority 2: Observability (S28–S29)

| Item | Status | Fix |
|------|--------|-----|
| Structured logging | ✅ Done (`createLogger`) | — |
| Error aggregation dashboard | Partial | Sentry if `SENTRY_DSN` configured |
| Performance monitoring | Missing | APM for slow endpoints |

### Priority 3: Developer experience (S30–S31)

| Item | Status | Fix |
|------|--------|-----|
| Browser E2E tests | Missing | Playwright beyond API smoke |
| Monorepo build times | ~45s cold | Optimize Vite/tsc caching |
| Storybook component library | Missing | Component catalog |

### Priority 4: Product completeness (S9–S25)

| Item | Status | Effort |
|------|--------|--------|
| Lifecycle emails | ✅ Scaffold (June 13) | Welcome, trial ending, payment failed |
| GDPR compliance | Backlog | Account export, deletion, cookie consent — 4 days |
| CSV export | Backlog | Export discovered products — 2 days |
| Zero downtime deployment | Not supported | Blue-green or canary — DevOps |

---

## Recommended refactorings

1. **Extract search logic into reusable service** — pluggable providers (2 days)
2. **Consolidate validation logic** — composable guards in `server/validation/` (1 day)
3. **Type-safe environment variables** — ✅ Done via `validateEnv.ts` (C-02)
4. **Decouple Stripe from billing procedures** — event-driven pattern for lifecycle emails (3 days)

---

## Test coverage expansion

Current: **211 tests** → Target: **400+ tests** (S32)

| Area | Current | Target | Gap |
|------|---------|--------|-----|
| Server auth | 18 | 35 | OAuth, 2FA, token rotation |
| Stripe webhooks | 12 | 40 | All event types, idempotency |
| Credits | 8 | 25 | Edge cases (refunds) |
| Search | 5 | 20 | Multi-provider failover |
| Client E2E | 0 | 150 | Login, checkout, admin |

---

## Quarterly roadmap (Q3 2026)

- **S26**: Security hardening (email verification, rate limiting)
- **S27–S28**: Observability (APM)
- **S29–S31**: Performance optimization + browser E2E
- **S32**: Developer UX (Storybook, faster builds)
- **S33–S35**: Product gaps (GDPR, CSV export, mobile prep)

---

## Success metrics (S26+)

**Engineering KPIs**

- Test coverage: 70% → 85% (S32)
- CI time: <10s (S26)
- Production error rate: <0.1% (S27)
- p95 API latency: <200ms (S29)

**Product KPIs**

- Signup → Trial: 3 days average
- Trial → Paid: 15% conversion
- Churn rate: <5% monthly (lifecycle emails)
- Feature adoption: Spy >60% of active users

---

*Next action: Begin S26 planning with security focus. Target: production-hardened by July 15, 2026.*

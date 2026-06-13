# Notion → Codebase Implementation Plan

> **Implemented and updated by Cursor** — June 13, 2026  
> Source: [TrendHunter-AI — Project Hub](https://app.notion.com/p/37edd43e0a9d817dbde3d18978a44bec) (Notion workspace)

This document tracks Notion project updates and their implementation status in the repo.

---

## Executive summary

TrendHunter-AI is **launch-ready** per Notion audit (June 13, 2026). Phases 1–15 hardening are complete. Remaining work splits into **ops config** (Stripe live, Redis, env vars) and **post-launch sprints** (S26+).

---

## Phase A — Pre-launch code (DONE ✅)

| Notion ID | Task | Repo location | Status |
|-----------|------|---------------|--------|
| C-01 | Non-live trending intel fetches | `server/ranking/scoreProduct.ts` | ✅ Fixed |
| C-02 | STRIPE_PRICE_* startup validation | `server/_core/validateEnv.ts` | ✅ Fixed |
| C-03 | discount_percent coupon consumption | `server/stripeWebhooks.ts` | ✅ Fixed |
| C-04 | Credit idempotency scan | `server/credits/index.ts` | ✅ Fixed |
| M-01 | Demand persistence duplicate | `shared/ranking.ts` | ✅ Fixed |
| M-02 | Ranking weights normalization | `server/adminRouter.ts` | ✅ Fixed |
| M-03 | Credit pack Stripe env in Docker | `docker-compose.prod.yml` | ✅ Fixed |
| M-04 | Expired trial API access | `server/_core/planMiddleware.ts` | ✅ Fixed |
| N-01 | SupplierConfidencePanel freshness | `client/.../SupplierConfidencePanel.tsx` | ✅ Fixed |
| N-02 | trpcErrors actionable copy | `client/src/lib/trpcErrors.ts` | ✅ Fixed |
| — | Data truth labels across UI | `DataFreshnessBadge`, `ConfidenceBadge` | ✅ Done |
| — | GitHub Actions CI | `.github/workflows/ci.yml` | ✅ Done |

---

## Phase B — Cursor session (June 13, 2026)

| Notion ID | Task | Action | Status |
|-----------|------|--------|--------|
| B-02 | Trial expiry only on startup | Hourly cron + lazy expiry in `resolveEffectivePlan` | ✅ Implemented |
| B-06 | expireStaleTrials leaves planId=trial | Set `planId: starter` on expiry | ✅ Implemented |
| S9 | Lifecycle emails | `server/notifications/lifecycleEmails.ts` + hooks | ✅ Implemented |
| 17 | Code Quality Roadmap doc | `docs/CODE-QUALITY-ROADMAP.md` | ✅ Synced |
| 18 | Production Readiness doc | `docs/PRODUCTION-READINESS.md` | ✅ Synced |
| 19 | Launch Week Ops doc | `docs/LAUNCH-WEEK-OPS.md` | ✅ Synced |

---

## Phase C — Ops config (manual, pre-launch)

These are Notion tasks that require production environment setup — not code changes:

| Task | Owner | Notes |
|------|-------|-------|
| Enable self-serve billing | Admin | Admin → Settings → `self_serve_billing` |
| Configure REDIS_URL | DevOps | Upstash for multi-instance rate limits |
| Stripe live mode + webhooks | DevOps | See `docs/STRIPE-SETUP.md` |
| Configure intelligence providers | DevOps | See `docs/API-ENV-SETUP.md` |
| Configure Sentry | DevOps | `SENTRY_DSN` in production |
| Configure Resend email | DevOps | `RESEND_API_KEY` + `EMAIL_FROM` |
| Run db:migrate on production | DevOps | Includes 0027/0028 index migrations |
| Create production admin | DevOps | `pnpm tsx scripts/create-admin.ts` |
| Post-deploy smoke tests | QA | `pnpm test:e2e` |

---

## Phase D — Post-launch sprints (Notion roadmap)

| Sprint | Focus | Effort | Priority |
|--------|-------|--------|----------|
| S8 | Email verification on signup | 2 days | High |
| S9 | Lifecycle email automation polish | 1 day | Medium (scaffold done) |
| S11 | GDPR account export/delete | 4 days | Medium |
| S13 | Playwright browser E2E | 3 days | Medium |
| S18B | 2FA (TOTP) | 4 days | Medium |
| S26 | Security hardening | — | Q3 2026 |
| S27–S28 | Observability (APM) | — | Q3 2026 |
| S29–S31 | Performance + E2E | — | Q3 2026 |
| S32 | Storybook + faster builds | — | Q3 2026 |
| S33–S35 | CSV export, mobile prep | — | Q3 2026 |

---

## Verification commands

```bash
pnpm check
pnpm test      # 211+ unit tests
pnpm build
pnpm test:e2e  # API smoke
```

---

## Related docs

| Doc | Path |
|-----|------|
| Launch Checklist | `docs/LAUNCH-CHECKLIST.md` |
| Launch Audit | `docs/LAUNCH-AUDIT-2026-06.md` |
| Hardening Workflow | `docs/HARDENING-WORKFLOW.md` |
| Code Quality Roadmap | `docs/CODE-QUALITY-ROADMAP.md` |
| Production Readiness | `docs/PRODUCTION-READINESS.md` |
| Launch Week Ops | `docs/LAUNCH-WEEK-OPS.md` |

---

*Last synced from Notion: June 13, 2026*

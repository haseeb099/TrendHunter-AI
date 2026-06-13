# Launch Week Ops Runbook

> **Implemented and updated by Cursor** — synced from Notion doc 19, June 13, 2026  
> Source: [📧 19 — Launch Week Ops Runbook](https://app.notion.com/p/37edd43e0a9d81a79ec9e3cf61e024d7)

Operational runbook for TrendHunter-AI launch week (June 24–30, 2026).

---

## Timeline

| Day | Dates | Focus |
|-----|-------|-------|
| Day 1–5 | June 14–18 | Prod env setup, Stripe live keys, Redis/Sentry/Resend |
| Day 6–10 | June 19–23 | QA staging smoke tests, UAT |
| Day 11–17 | June 24–30 | Soft launch to beta, monitor logs, iterate |
| Post-launch | July+ | Daily monitoring, lifecycle emails, onboarding refinement |

---

## Pre-launch ops checklist

### Environment (Day 1–3)

```bash
# Required production env vars — see docs/API-ENV-SETUP.md
JWT_SECRET=...
DATABASE_URL=...
APP_URL=https://app.trendhunter.com
RESEND_API_KEY=...
EMAIL_FROM=TrendHunter <noreply@trendhunter.com>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...
STRIPE_PRICE_AGENCY=price_...
STRIPE_PRICE_CREDITS_50=price_...
STRIPE_PRICE_CREDITS_100=price_...
STRIPE_PRICE_CREDITS_250=price_...
REDIS_URL=redis://...        # recommended multi-instance
SENTRY_DSN=https://...       # recommended
GROQ_API_KEY=...             # AI features
```

### Admin setup (Day 2)

1. Create admin: `pnpm tsx scripts/create-admin.ts`
2. Enable **Self-serve billing** in Admin → Settings
3. Verify plan catalog and coupon types
4. Confirm maintenance mode is **off**

### Stripe live (Day 3)

1. Create live products/prices per `docs/STRIPE-SETUP.md`
2. Configure webhook: `POST https://app.trendhunter.com/api/stripe/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`
4. Test with Stripe CLI before go-live

### Deploy (Day 5)

```bash
pnpm db:migrate
pnpm build
docker-compose -f docker-compose.prod.yml up -d
docker exec trendhunter-app node scripts/migrate.mjs  # verify migrations
```

---

## Smoke test script

```bash
pnpm test:e2e
# or
pnpm tsx scripts/e2e-api-test.ts
```

Manual checks:

1. Register → trial starts → dashboard loads
2. Discover search returns results (cached or live)
3. Billing page shows plans → Stripe checkout opens
4. Admin panel: users, plans, coupons, settings
5. Expired trial blocked from protected routes

---

## Monitoring during launch

### Dashboards to keep open

- Sentry — error rate and stack traces
- Stripe Dashboard — payments and webhook delivery
- MySQL — connection pool, slow query log
- Uptime monitor — health endpoint

### Escalation triggers

| Signal | Threshold | Action |
|--------|-----------|--------|
| Error rate | > 1% for 5 min | Roll back or hotfix |
| Checkout failures | Any sustained | Check Stripe status + webhook logs |
| Payment webhook failures | > 2/hour | Verify `STRIPE_WEBHOOK_SECRET` |
| DB pool exhausted | Connection errors | Scale or restart with pool tuning |
| Auth failures | > 10/min | Possible attack — check rate limits |

### Monitoring cadence (launch day)

- Every 5 min — first hour
- Every 15 min — hours 2–4
- Every hour — hours 5–24

---

## Rollback procedure

1. Revert Docker image to previous tag
2. Load balancer → previous instance
3. Verify health endpoint
4. Check Stripe webhooks still delivering
5. Post incident summary in #incidents

---

## Support contacts

- Engineering on-call: [TBD]
- Stripe support: dashboard.stripe.com/support
- Status page: status.trendhunter.com (if configured)

---

## Post-launch (week 1)

- [ ] Review Sentry errors daily
- [ ] Monitor trial → paid conversion
- [ ] Verify lifecycle emails delivering (welcome, trial ending, payment failed)
- [ ] Collect beta user feedback
- [ ] Triage Issues & Bugs in Notion

---

*See also: `docs/LAUNCH-CHECKLIST.md`, `docs/PRODUCTION-READINESS.md`, `docs/NOTION-IMPLEMENTATION-PLAN.md`*

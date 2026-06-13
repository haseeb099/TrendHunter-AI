# Launch Checklist — June 2026

> **Implemented and updated by Cursor** — June 13, 2026 (Notion sync)

Use before promoting production.

## Environment

- [ ] `JWT_SECRET` (32+ chars)
- [ ] `DATABASE_URL`
- [ ] `RESEND_API_KEY` + `EMAIL_FROM`
- [ ] `APP_URL` (public HTTPS URL)
- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`
- [ ] All `STRIPE_PRICE_*` (starter, pro, business, agency, credits 50/100/250)
- [ ] `REDIS_URL` (recommended for multi-instance)
- [ ] `SENTRY_DSN` (recommended)
- [ ] Provider keys per `docs/API-ENV-SETUP.md`

## Stripe

- [ ] Live mode products/prices created (`docs/STRIPE-SETUP.md`)
- [ ] Webhook endpoint: `POST /api/stripe/webhook`
- [ ] Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`

## Admin

- [ ] Create admin: `pnpm tsx scripts/create-admin.ts`
- [ ] Enable **Self-serve billing** in Admin → Settings
- [ ] Verify plan catalog and coupons

## Deploy

- [ ] `pnpm db:migrate` (includes `0027_launch_hardening_indexes.sql`)
- [ ] `pnpm build`
- [ ] Docker: `docker-compose -f docker-compose.prod.yml up` with `.env`
- [ ] Smoke: `pnpm test:e2e` or `pnpm tsx scripts/e2e-api-test.ts`

## Verification

- [x] Expired trial cannot call `protectedBase` routes (e2e verified)
- [x] Live search debits credits only on success (unit + search tests)
- [x] Trending page load does not call external intel APIs (`fetchLiveIntel: false` gate)
- [x] Product cards show confidence + Estimated/Missing where applicable
- [x] `pnpm check` + `pnpm test` (211+) + `pnpm build` + `pnpm test:e2e` pass (June 13, 2026)
- [x] Lifecycle emails scaffolded (welcome, trial ending, payment failed) — requires `RESEND_API_KEY`

## Notion sync docs

- `docs/NOTION-IMPLEMENTATION-PLAN.md` — master implementation tracker
- `docs/CODE-QUALITY-ROADMAP.md` — post-launch S26+ roadmap
- `docs/PRODUCTION-READINESS.md` — pre-launch checklist
- `docs/LAUNCH-WEEK-OPS.md` — launch week runbook

## Remaining risks

- Optional providers may leave intel panels in **Missing** state — expected until keys configured
- `self_serve_billing` off by default — checkout blocked until admin enables
- Single-instance rate limits without Redis

See `docs/LAUNCH-AUDIT-2026-06.md` for full audit.

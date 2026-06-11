# TrendHunter Launch FAQ

Answers for private beta users, support, and on-call during launch week.

## Getting access

**How do I sign up?**  
Create an account at `/register`. You must accept the Terms of Service and Privacy Policy. If `BETA_MODE=true` and an invite code is configured, you also need the code from your invite email.

**Registration is closed — what now?**  
An admin may have disabled new sign-ups in Admin → Settings. Existing users can still sign in. Contact support for an invite when slots reopen.

## Account & login

**I forgot my password.**  
Use **Forgot password** on the login page. You'll receive a reset link by email (requires `RESEND_API_KEY` in production). Links expire after one hour.

**My account says deactivated or paused.**  
Deactivated accounts cannot use workspace features. Paused accounts are limited to billing/support flows. Email the support address shown in the app footer or Admin → Settings.

**Do I need a credit card for the trial?**  
No. New accounts start on a Pro trial without Stripe checkout. Upgrade later from **Billing** when self-serve billing is enabled.

## Data & search

**Why do results say "cached" or show a degraded banner?**  
TrendHunter defaults to cache-first search to control API cost. Paid live APIs (eBay, SerpAPI, TikTok) must be configured in `.env`. The **Data sources** bar on Search and Intelligence shows which providers are active. A yellow **Degraded coverage** banner means some live APIs are missing — results may be catalog-only until ingest runs.

**When does data refresh?**  
Daily ingest (`pnpm ingest:daily` or `/api/ingest/daily` with `INGEST_SECRET`) refreshes catalogs, trending snapshots, and intelligence caches.

## Billing

**Stripe checkout fails or billing is disabled.**  
Self-serve billing is controlled in Admin → Settings. Production requires `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PUBLISHABLE_KEY`. Until then, admins can assign plans or redeem coupon codes.

## For operators

**Health checks**  
- Shallow: `system.health` (load balancer)  
- Deep: `system.deepHealth` — database ping, Redis (if `REDIS_URL` set), Stripe (if configured)

**Observability**  
Set `SENTRY_DSN` (and `VITE_SENTRY_DSN` or same value for the client build) for error tracking. Server logs are structured JSON via `server/_core/logger.ts`.

**Launch test suite**  
```bash
pnpm test:launch
```
Requires a running server, `DATABASE_URL`, and optionally `PASSWORD_RESET_TEST_MODE=true` for the reset flow. Set `BETA_INVITE_CODE` if beta mode is on.

**Required production env vars**  
`JWT_SECRET`, `DATABASE_URL`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` — startup fails if any are missing when `NODE_ENV=production`.

# Production Readiness Checklist

> **Implemented and updated by Cursor** — synced from Notion doc 18, June 13, 2026  
> Source: [🚀 18 — Production Readiness Checklist](https://app.notion.com/p/37edd43e0a9d81468f3bdb9d061e1b5a)

**Target launch**: June 30, 2026  
**Status**: 🟢 Launch-ready with ops config

---

## Infrastructure & deployment

### Pre-deployment (before June 27)

- [ ] Docker image builds clean
  ```bash
  docker build -t trendhunter:prod .
  docker run -e DATABASE_URL=... trendhunter:prod npm run migrate
  ```
- [ ] Database backups configured (MySQL daily → S3, 30-day retention)
- [ ] Environment variables validated (all `STRIPE_PRICE_*`, API keys, `JWT_SECRET`, `DATABASE_URL`)
- [ ] SSL/TLS configured (HTTPS, auto-renewal, HSTS)
- [ ] CDN set up (optional — CloudFlare/CloudFront for static assets)

### Deployment day (June 27)

- [ ] Roll out with zero downtime (blue-green or canary)
- [ ] Database migrations applied: `pnpm db:migrate --env production`
- [ ] Health check: `curl https://app.trendhunter.com/health` → `{"status":"ok"}`

---

## Security hardening

### Authentication

- [x] Email/password auth working
- [x] Google OAuth configured
- [ ] Email verification on signup (deferred S8 — allow unverified with banner)
- [x] Password reset flow (Resend email, 1-hour token expiry)
- [x] JWT httpOnly cookies with Secure + SameSite

### Data protection

- [x] Passwords bcrypt-hashed
- [x] CORS configured for production origin
- [x] Rate limiting active (`server/_core/rateLimit.ts` — set `REDIS_URL` for multi-instance)
- [x] SQL injection prevented (Drizzle ORM parameterized queries)
- [x] XSS protection (Helmet CSP in production)

### API security

- [x] Stripe webhook signature verified
- [ ] API keys in secrets manager (1Password / AWS — not in repo)
- [x] Admin audit logging enabled

---

## Database & data integrity

- [x] All 24 tables created with foreign keys and indexes
- [x] Credit ledger append-only
- [x] Subscription state machine enforced server-side
- [x] Coupon consumption transactional (C-03 fixed)
- [ ] Query performance benchmarked (<100ms trending, <50ms analytics counts)
- [ ] Connection pooling monitored

---

## Monitoring & alerts

- [ ] Sentry configured (`SENTRY_DSN`, alerts to Slack #incidents)
- [x] Structured JSON logging in production (`server/_core/logger.ts`)
- [ ] Performance metrics (p50/p95/p99 latency)
- [ ] Business metrics dashboard (signups, trials, conversions, churn)
- [ ] Uptime monitor (health ping every 5 min, 3 geos)

---

## Compliance & legal

- [ ] Privacy policy at `/privacy`
- [ ] Terms of service at `/terms`
- [ ] Cookie consent banner (optional pre-launch)
- [ ] GDPR data export (deferred S11 — manual via support)
- [ ] Account deletion (deferred S11 — manual via support)
- [x] Stripe PCI compliance (Stripe handles card data)
- [ ] WCAG 2.1 AA basic compliance

---

## Launch day checklist

### Pre-launch (2 hours before)

- [ ] Team assembly + monitoring dashboards open
- [ ] Smoke test script ready (signup → trial → checkout flow)

### Launch

- [ ] Code reviewed by 2 engineers
- [ ] Docker image vulnerability scan
- [ ] Migrations tested on staging clone
- [ ] Canary rollout: 5% → 25% → 50% → 100%

### Post-launch (2 hours after)

- [ ] Smoke tests pass
- [ ] Sentry error rate < 0.1%
- [ ] API p95 latency < 300ms
- [ ] First signups + checkout + webhook verified

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Checklist completed | — | June 13, 2026 |
| Lead engineer review | — | — |
| Product owner approval | — | — |

**Notes**: S8 (email verification) and S11 (GDPR export/delete) deferred post-launch.

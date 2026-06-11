# Docker production deploy runbook

Deploy TrendHunter with `docker-compose.prod.yml` on a VPS or single host. This covers Phase 2 steps 7–11 of the ship plan.

## Prerequisites

- Docker and Docker Compose v2
- Domain pointed at the host (for `APP_URL` and OAuth callbacks)
- `.env` file on the host (never commit secrets)

## Step 7 — Production env preparation

Copy `.env.example` to `.env` on the server and set at minimum:

| Variable | Notes |
|----------|-------|
| `JWT_SECRET` | Strong random string |
| `DATABASE_URL` | Set automatically by compose if using bundled MySQL |
| `APP_URL` | Public URL, e.g. `https://app.yourdomain.com` |
| `OPENAI_API_KEY` | Required for AI features |
| `RESEND_API_KEY` | Required in production (password reset, digests) |
| `STRIPE_*` | Required in production per `validateEnv.ts` |

### Research Engine variables

| Variable | Recommended prod value |
|----------|------------------------|
| `SERPAPI_DAILY_CAP` | 30–50 |
| `DISCOVERY_QUEUE_MAX_PER_RUN` | 40 |
| `DISCOVERY_QUEUE_PRIORITY_MIN` | 0.4 |
| `RANKING_VERSION` | v2 |
| `REDIS_URL` | Upstash or self-hosted (circuit breaker state) |
| `INGEST_SECRET` | Strong secret for manual ingest trigger |
| `HEALTH_PROBE_EXTERNAL` | `true` for deep provider probes |
| `SUPPORTED_REGIONS` | `US,UK,EU,GLOBAL` |

All of these are passed through in `docker-compose.prod.yml`. Audit the file when adding new server env vars.

## Step 8 — Build and start

```bash
pnpm docker:prod
# or:
docker compose -f docker-compose.prod.yml up --build -d
```

The app container runs migrations on boot via `server/_core/migrate.ts`. Confirm migrations `0015` and `0016` applied:

```bash
docker exec trendhunter-app node scripts/migrate.mjs
```

Check logs:

```bash
docker compose -f docker-compose.prod.yml logs -f app
```

## Step 9 — Post-deploy smoke test

| Check | How |
|-------|-----|
| Health | `GET {APP_URL}/api/trpc/system.health` or `system.deepHealth` |
| Ingest status | `GET {APP_URL}/api/ingest/status` (with `INGEST_SECRET` if set) |
| Discover | Open `/dashboard` — cached results + freshness badges |
| Search explain | Search tab — rank reason + trend score popover |
| Admin scorecard | `/admin/research-quality` |
| Admin revenue | `/admin/revenue` (MRR from Stripe-linked users) |
| Daily cron | `.github/workflows/daily-ingest.yml` targets prod URL |

## Step 10 — First production ingest

```bash
curl -X POST https://your-domain/api/ingest/daily \
  -H "Authorization: Bearer $INGEST_SECRET"
```

Confirm `discovery_queue` rows move `pending` → `done` and trending snapshot refreshes.

## Step 11 — Monitor first 48h

Watch:

- Zero-result rate (Admin → Research quality)
- Provider degraded states (`ProviderStatusBar` in UI)
- SerpAPI daily cap exhaustion in logs
- `ingest_retries` queue depth
- MRR / churn (Admin → Revenue)

## Rollback

```bash
pnpm docker:prod:down
# Restore MySQL backup if migrate failed
docker compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Migrate fails on boot | Exec `migrate.mjs` manually; restore DB backup before retry |
| Missing search results | Check `SERPAPI_KEY`, `SERPAPI_DAILY_CAP`, ingest logs |
| OAuth redirect error | `APP_URL` must match Google authorized redirect URI |
| Redis warnings | Set `REDIS_URL` for multi-instance rate limits |

See also [`docs/API-ENV-SETUP.md`](API-ENV-SETUP.md) for full variable reference.

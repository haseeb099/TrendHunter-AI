# DropHunter AI (TrendHunter-AI)

AI-powered product research workspace for e-commerce and dropshipping. Discover trending products, validate demand with AI, analyze competitors, vet suppliers, calculate margins, and manage your product pipeline — all in one place.

**Repository:** [github.com/haseeb099/TrendHunter-AI](https://github.com/haseeb099/TrendHunter-AI)

---

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Subscription plans](#subscription-plans)
- [Billing modes](#billing-modes)
- [Admin console](#admin-console)
- [API & integrations](#api--integrations)
- [Scripts reference](#scripts-reference)
- [Testing](#testing)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

DropHunter AI helps solo sellers, growing brands, and agencies research winning products before they invest in inventory or ads. The workspace covers the full research workflow:

**Discover → Validate → Compete → Source → Launch**

| Persona | Goal |
|---------|------|
| **Solo seller** | Find 1–3 winning products/month; validate before sourcing |
| **Growing brand** | Scale research with pipeline, analytics, and higher limits |
| **Agency / power user** | High-volume search, AI features, and multiple niches |

---

## Features

### Research workspace (12 tabs)

| Module | Route | Description | Plan gate |
|--------|-------|-------------|-----------|
| **Discover** | `/dashboard` | Multi-provider product search, trending feed, filters | All plans |
| **Validate** | `/dashboard/validate` | AI scoring: trend, saturation, margin, supplier reliability | Pro+ |
| **Competitors** | `/dashboard/competitors` | Store/keyword competitive analysis | Pro+ |
| **Market Gap** | `/dashboard/marketgap` | Niche opportunity finder | Pro+ |
| **Profit Calc** | `/dashboard/profit` | Landed cost, fees, margin scenarios | All plans |
| **Suppliers** | `/dashboard/suppliers` | CJ / AliExpress offers + supplier CRM | Starter+ |
| **Social Kit** | `/dashboard/social` | Hashtags, ad copy, captions | Pro+ |
| **AI Agent** | `/dashboard/agent` | Persistent research chat | Pro+ |
| **Pipeline** | `/dashboard/pipeline` | Kanban: testing → scaling → paused → dropped (drag-and-drop) | All plans |
| **Watchlist** | `/dashboard/watchlist` | Saved products with detail drawer | All plans |
| **Analytics** | `/dashboard/analytics` | Usage and portfolio metrics | Starter+ |
| **Billing** | `/dashboard/billing` | Plans, coupons, Stripe Checkout | All users |
| **Account** | `/dashboard/account` | Profile, password, security | All users |

### Platform capabilities

- **Auth** — Email/password registration and login with JWT httpOnly session cookies
- **Plan enforcement** — Server-side middleware (`featureProcedure`, `searchProcedure`, `aiProcedure`) + client gates (`PlanFeatureGate`, `usePlan`)
- **Account states** — `active`, `paused`, `flagged`, `deactivated` with enforced access rules
- **Admin console** — User management, plan catalog editor, coupons, platform settings, audit log
- **Billing** — Manual plan selection (beta) or Stripe Checkout + Customer Portal + webhooks (production)
- **Search providers** — Free catalogs (DummyJSON, FakeStore, Shoptera), eBay, SerpAPI (Amazon/Google Shopping), TikTok Shop, mock fallback
- **Suppliers** — CJ Dropshipping and AliExpress Open Platform integration
- **Storage** — Local disk uploads or optional S3
- **Rate limiting** — Auth endpoint throttling

---

## Tech stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite 7, Tailwind CSS 4, wouter, shadcn/ui, TanStack Query |
| **Backend** | Express 4, tRPC 11, Zod 4, SuperJSON |
| **Database** | MySQL 8.4, Drizzle ORM |
| **Auth** | Email/password, JWT (`jose`) in httpOnly cookies |
| **Payments** | Stripe Checkout, Customer Portal, signed webhooks |
| **AI** | OpenAI-compatible API (OpenAI or Groq) |
| **Testing** | Vitest |
| **Package manager** | pnpm 10 |

---

## Project structure

```
TrendHunter-AI/
├── client/                 # React SPA (Vite)
│   └── src/
│       ├── pages/          # Dashboard tabs, admin, auth, landing
│       ├── components/     # UI, admin, workspace, side-panel
│       ├── _core/hooks/    # useAuth, usePlan
│       └── config/         # dashboardNav.ts
├── server/                 # Express + tRPC API
│   ├── _core/              # Auth, session, env, plan middleware, rate limits
│   ├── search/             # Multi-provider product search
│   ├── suppliers/          # CJ, AliExpress
│   ├── trending/           # Cached trending feed
│   ├── routers.ts          # Main app router
│   ├── billingRouter.ts    # Plans, checkout, coupons
│   ├── adminRouter.ts      # Admin CRUD + settings
│   └── stripe*.ts          # Stripe SDK + webhooks
├── shared/                 # plans.ts, const.ts, types
├── drizzle/                # Schema + SQL migrations
├── scripts/                # migrate, create-admin, e2e tests
├── docs/                   # PRD, TRD, setup guides, roadmap
├── docker-compose.yml      # Local MySQL
├── docker-compose.prod.yml # Production app + MySQL
└── Dockerfile              # Multi-stage production build
```

---

## Prerequisites

- **Node.js** 22+
- **pnpm** 10+ (`corepack enable`)
- **Docker** (for local MySQL via `docker compose`)
- Optional API keys for live search, AI, suppliers, and Stripe (see [Environment variables](#environment-variables))

---

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/haseeb099/TrendHunter-AI.git
cd TrendHunter-AI
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` — at minimum set `DATABASE_URL` and `JWT_SECRET`. See [docs/API-ENV-SETUP.md](docs/API-ENV-SETUP.md) for every variable.

### 3. Start database and migrate

```bash
pnpm db:up          # MySQL on localhost:3306
pnpm db:migrate     # Apply Drizzle migrations
```

### 4. Create an admin user

```bash
pnpm tsx scripts/create-admin.ts
```

Follow the prompts to set email and password.

### 5. Run development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The dev server runs Express (API) and Vite (HMR) together on port 3000.

### One-command setup

```bash
pnpm setup   # install + db:up + db:push (generate + migrate)
```

---

## Environment variables

### Required (P0)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | Session cookie signing secret |

### Free search (no API key)

| Variable | Default | Purpose |
|----------|---------|---------|
| `FREE_RETAIL_ENABLED` | `true` | DummyJSON + FakeStore catalogs |
| `SHOPTERA_ENABLED` | `true` | Shoptera free catalog (300 req/hr) |

### Marketplace search (P1)

| Provider | Key variables |
|----------|---------------|
| eBay Browse API | `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_MARKETPLACE_ID` |
| SerpAPI | `SERPAPI_KEY`, `SERPAPI_AMAZON_DOMAIN`, `SERPAPI_GOOGLE_COUNTRY` |
| TikTok Shop | `TIKTOK_*` or `TIKTOK_SHOP_API_KEY` |

### AI (P3)

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | OpenAI or compatible provider |
| `GROQ_API_KEY` | Alternative — set with Groq base URL |
| `OPENAI_MODEL` | Default: `gpt-4o-mini` |

### Suppliers (P4)

| Variable | Purpose |
|----------|---------|
| `CJ_API_KEY` | CJ Dropshipping warehouse/shipping |
| `ALIEXPRESS_APP_KEY`, `ALIEXPRESS_APP_SECRET` | AliExpress Open Platform |

### Billing (optional)

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe API secret |
| `STRIPE_PUBLISHABLE_KEY` | Client-side Stripe |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `STRIPE_PRICE_STARTER/PRO/BUSINESS/AGENCY` | Price IDs from Stripe Dashboard |
| `APP_URL` | Public URL for Checkout redirects |

### Storage (optional)

| Variable | Purpose |
|----------|---------|
| `UPLOADS_DIR` | Local upload directory (default: `uploads`) |
| `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | AWS S3 storage |

Full reference: [docs/API-ENV-SETUP.md](docs/API-ENV-SETUP.md)

---

## Subscription plans

Plans are defined in `shared/plans.ts` and overridable via **Admin → Plans**.

| Plan | Price | Searches/mo | Pipeline | AI calls | Key unlocks |
|------|-------|-------------|----------|----------|-------------|
| **Trial** | Free (3 days) | 500 | 100 | 200 | Full Pro access |
| **Starter** | $29/mo | 100 | 15 | 0 | Discover, profit, pipeline, watchlist, suppliers |
| **Pro** | $79/mo | 500 | 100 | 300 | + AI validate, competitors, market gap, social, agent |
| **Business** | $149/mo | 2,000 | 500 | 1,000 | + advanced analytics |
| **Agency** | $199/mo | Unlimited | Unlimited | Unlimited | Highest quotas |

**Coupon types:** grant plan, extend trial, bonus searches, percent discount (Stripe promotion codes when configured).

---

## Billing modes

### Beta (no Stripe)

1. Leave `STRIPE_*` env vars unset
2. Admin → Settings → enable **Self-serve billing** (optional)
3. Users upgrade via in-app plan selection or coupon redemption
4. Admin can assign plans directly

### Production (Stripe)

1. Set all `STRIPE_*` env vars and `APP_URL`
2. Create Products/Prices in [Stripe Dashboard](https://dashboard.stripe.com)
3. Register webhook: `https://your-domain/api/webhooks/stripe`
4. Admin → Settings → **Self-serve billing** ON
5. Users pay via Stripe Checkout; webhooks sync `planId` and subscription IDs

Local webhook testing:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

See [docs/STRIPE-SETUP.md](docs/STRIPE-SETUP.md) for the full walkthrough.

---

## Admin console

Access at `/admin` (requires `role: admin`).

| Tab | Capabilities |
|-----|--------------|
| **Users** | Create, flag, pause, deactivate, plan override, search/AI limits |
| **Plans** | Edit plan catalog (features, limits, pricing labels) |
| **Coupons** | Create/redeem promotions (5 types) |
| **Settings** | Registration toggle, maintenance mode, AI kill switch, self-serve billing |
| **Activity** | Audit log of admin actions |

Bootstrap first admin:

```bash
pnpm tsx scripts/create-admin.ts
```

---

## API & integrations

### tRPC routers

| Router | Endpoints |
|--------|-----------|
| `auth` | Register, login, logout, profile, password |
| `billing` | Plans, checkout, portal, coupons, trial |
| `admin` | Users, plans, coupons, settings, analytics |
| `search` | Product search, trending, filters, presets |
| `pipeline` | Kanban CRUD + stage updates |
| `validate`, `competitor`, `agent`, `social`, `marketgap` | AI-powered features |
| `suppliers` | CJ/AliExpress offers, supplier CRM |

### Auth flow

1. Register/login → JWT issued in httpOnly cookie (`app_session_id`)
2. Procedures: `publicProcedure` → `authenticatedProcedure` → `protectedProcedure` → `adminProcedure`
3. `protectedProcedure` enforces maintenance mode and account usability (`active` only for workspace)

### Search providers

| Provider | Status | Notes |
|----------|--------|-------|
| DummyJSON, FakeStore, Shoptera | Always available | No API key |
| eBay Browse API | Optional | Sandbox or production |
| SerpAPI | Optional | Amazon + Google Shopping |
| TikTok Shop | Optional | Official or third-party |
| Mock | Fallback | When no providers configured |

---

## Scripts reference

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (API + Vite HMR on port 3000) |
| `pnpm build` | Production build (Vite client + esbuild server) |
| `pnpm start` | Run production server (`dist/index.js`) |
| `pnpm check` | TypeScript type check |
| `pnpm test` | Run Vitest unit tests |
| `pnpm test:e2e` | API end-to-end smoke test |
| `pnpm format` | Prettier format |
| `pnpm db:up` | Start MySQL via Docker Compose |
| `pnpm db:down` | Stop MySQL container |
| `pnpm db:migrate` | Apply Drizzle migrations |
| `pnpm db:push` | Generate + migrate schema changes |
| `pnpm setup` | Install + db:up + db:push |
| `pnpm docker:prod` | Build and run production Docker stack |
| `pnpm search:verify` | Verify search provider configuration |

---

## Testing

```bash
pnpm test        # 54 unit tests (billing, admin, plans, stripe, analytics, …)
pnpm check       # TypeScript — no emit
pnpm test:e2e    # API smoke test (default port 3000)
```

Tests use `appRouter.createCaller(createTestContext())` with mocked DB where appropriate.

---

## Deployment

### Docker (recommended)

```bash
# Configure .env with production values
pnpm docker:prod
```

The production compose file builds the Dockerfile, runs migrations on boot, and exposes port 3000. Ensure `DATABASE_URL`, `JWT_SECRET`, and optional `STRIPE_*` / `S3_*` are set.

### Manual

```bash
pnpm build
pnpm db:migrate
NODE_ENV=production pnpm start
```

### Health check

`GET /` returns the SPA. Docker healthcheck pings the HTTP server on `PORT` (default 3000).

---

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/PRD.md](docs/PRD.md) | Product requirements — personas, features, plans, success metrics |
| [docs/TRD.md](docs/TRD.md) | Technical architecture — routers, auth, billing, data model |
| [docs/API-ENV-SETUP.md](docs/API-ENV-SETUP.md) | Complete environment variable reference |
| [docs/STRIPE-SETUP.md](docs/STRIPE-SETUP.md) | Stripe Checkout + webhooks walkthrough |
| [docs/SPRINT-ROADMAP.md](docs/SPRINT-ROADMAP.md) | Phased delivery plan (Sprints 1–6, completed) |
| [docs/PROJECT-AUDIT-AND-ROADMAP.md](docs/PROJECT-AUDIT-AND-ROADMAP.md) | Full audit + forward roadmap (S7–S22) |

---

## Roadmap

**Completed (Sprints 1–6):**

- S1 — Foundation & Manus template cleanup
- S2 — PRD & TRD documentation
- S3 — Flagged account enforcement
- S4 — Stripe checkout & webhooks
- S5 — Discount coupons & billing tests
- S6 — Pipeline kanban drag-and-drop

**Upcoming highlights** (see [PROJECT-AUDIT-AND-ROADMAP.md](docs/PROJECT-AUDIT-AND-ROADMAP.md)):

- S7 — Legacy cleanup, CI/CD
- S8 — Password reset, email verification
- S9 — Transactional email (trial expiry, payment failed)
- S12+ — Additional search providers, export features

---

## License

MIT

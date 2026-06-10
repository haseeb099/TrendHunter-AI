# DropHunter AI — Technical Requirements Document (TRD)

## 1. Architecture

```
client/ (React 19 + Vite + wouter)
  └── tRPC + TanStack Query → /api/trpc (cookie session)

server/ (Express 4 + tRPC 11)
  ├── routers.ts (appRouter)
  ├── billingRouter, adminRouter
  ├── plans.ts, planCatalog.ts, coupons.ts
  ├── stripe.ts, stripeWebhooks.ts
  └── search/, suppliers/, trending/

shared/ — plans, const, types
drizzle/ — MySQL schema + migrations
```

## 2. Auth

- Email/password register & login
- JWT in httpOnly cookie (`app_session_id`) via `jose`
- Procedures: `publicProcedure` → `authenticatedProcedure` → `protectedProcedure` → `adminProcedure`
- `protectedProcedure` enforces maintenance mode + `assertAccountUsable()`

## 3. Plan enforcement

- Server: `planMiddleware.ts` — `featureProcedure`, `searchProcedure`, `aiProcedure`, quotas
- Client: `usePlan()` + `PlanFeatureGate` / `GatedContent` in `Dashboard.tsx`
- Catalog: DB `plan_configs` with cache in `planCatalog.ts`

## 4. Billing flow

### Manual (no Stripe)

1. Admin enables self-serve OR user redeems coupon
2. `billing.selectPlan` → `assignPaidPlan()` writes DB

### Stripe

1. `billing.createCheckoutSession` → redirect to Stripe
2. Webhook `checkout.session.completed` → `updateUserSubscription()` with Stripe IDs
3. `customer.subscription.deleted` → `planStatus: cancelled`
4. `billing.createPortalSession` → manage payment method / cancel

Webhook route: `POST /api/webhooks/stripe` (raw body, before `express.json()`).

## 5. Data model (key tables)

| Table | Purpose |
|-------|---------|
| `users` | Auth, plan, Stripe IDs, account status |
| `plan_configs` | Editable plan catalog |
| `platform_settings` | Trial days, maintenance, self_serve_billing |
| `coupons` / `coupon_redemptions` | Promotions; optional `stripePromotionCodeId` |
| `stripe_webhook_events` | Idempotent webhook processing |
| `pipeline_items` | Kanban stages |
| `admin_audit_log` | Admin action trail |

## 6. API surface (tRPC routers)

| Router | Notes |
|--------|-------|
| `auth` | me, register, login, profile, password |
| `billing` | plans, checkout, portal, coupons, trial |
| `admin` | users, plans, coupons, settings, analytics |
| `search` | product search, trending, filters |
| `pipeline` | CRUD + stage updates |
| `validate`, `competitor`, `agent`, … | AI features via `aiProcedure` |

## 7. Environment

See `.env.example` and `docs/API-ENV-SETUP.md`.

Required: `DATABASE_URL`, `JWT_SECRET`  
Billing: `STRIPE_*`, `APP_URL`  
AI: `OPENAI_API_KEY` or `GROQ_API_KEY`

## 8. Deployment

- Build: `pnpm build` (Vite client + esbuild server)
- Start: `pnpm start`
- DB: `pnpm db:migrate`
- Admin bootstrap: `pnpm tsx scripts/create-admin.ts`

## 9. Testing

- Vitest: `server/*.test.ts`
- Patterns: `appRouter.createCaller(createTestContext())`, `vi.mock("./db")`

## 10. Security checklist

- Never expose `passwordHash` (`toPublicUser`)
- Stripe webhook signature verification
- `selectPlan` blocked when Stripe configured
- Admin-only `adminProcedure`
- Rate limits: future enhancement on export/reset-password

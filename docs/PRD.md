# DropHunter AI — Product Requirements Document (PRD)

## 1. Vision

DropHunter AI helps e-commerce and dropshipping operators discover trending products, validate demand, analyze competitors, vet suppliers, and manage a product pipeline — with AI-assisted research across the full workflow.

## 2. Target users

| Persona | Goal |
|---------|------|
| **Solo seller** | Find 1–3 winning products/month; validate before sourcing |
| **Growing brand** | Scale research; pipeline + analytics; team-ready plans |
| **Agency / power user** | High volume search + AI; multiple niches |

## 3. Core modules (workspace tabs)

| Module | Value |
|--------|-------|
| **Discover** | Multi-provider product search + trending feed |
| **Validate** | AI scoring: trend, saturation, margin, supplier reliability |
| **Competitor Spy** | Store/keyword competitive analysis |
| **Market Gap** | Niche opportunity finder |
| **Profit Calculator** | Landed cost, fees, margin scenarios |
| **Suppliers** | CJ / AliExpress offers + supplier CRM |
| **Social Kit** | Hashtags, ad copy, captions |
| **AI Agent** | Persistent research chat |
| **Pipeline** | Kanban: testing → scaling → paused → dropped |
| **Watchlist** | Saved products with drawer workspace |
| **Analytics** | Usage and portfolio metrics |

## 4. Subscription plans

| Plan | Audience | Key unlock |
|------|----------|------------|
| Trial | New users | Pro features for N days |
| Starter | Hobby | Discover, profit, pipeline, watchlist, suppliers |
| Pro | Serious sellers | AI validation, agent, social, competitors, market gap |
| Business | Teams | Higher limits |
| Agency | Power users | Unlimited quotas |

Plan limits and feature IDs are defined in `shared/plans.ts` and overridable via Admin → Plans.

## 5. Account states

| Status | Behavior |
|--------|----------|
| `active` | Full access per plan |
| `paused` | Billing + account only |
| `flagged` | Under review — billing + account only |
| `deactivated` | Cannot sign in |

## 6. Billing

- **Without Stripe:** Coupons and admin assignment; optional manual self-serve (admin toggle).
- **With Stripe:** Checkout Sessions + Customer Portal; webhooks sync `planId` and subscription IDs.

## 7. Admin console

- User management (create, flag, pause, limits, plan override)
- Plan catalog editor
- Coupons (grant plan, extend trial, bonus searches, % discount)
- Platform settings (registration, maintenance, AI kill switch, self-serve billing)
- Activity / audit log

## 8. Success metrics

- Monthly active researchers (search events)
- Trial → paid conversion
- Pipeline items created per user
- AI calls per active subscriber
- Churn / cancellation rate (Stripe)

## 9. Non-goals (current release)

- Multi-tenant organizations / seat licensing
- Native mobile apps
- Automated ad spend / store sync

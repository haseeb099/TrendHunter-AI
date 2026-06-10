# DropHunter / TrendHunter — Sprint Roadmap

Phased delivery plan for production hardening. Each sprint is independently shippable.

> **Full project audit (bugs, gaps, S7–S22 roadmap):** [`PROJECT-AUDIT-AND-ROADMAP.md`](./PROJECT-AUDIT-AND-ROADMAP.md)

| Sprint | Theme | Status |
|--------|-------|--------|
| **S1** | Foundation & cleanup | Done |
| **S2** | Product & technical docs (PRD/TRD) | Done |
| **S3** | Flagged account enforcement | Done |
| **S4** | Stripe checkout + webhooks | Done |
| **S5** | Discount coupons + billing tests | Done |
| **S6** | Pipeline kanban drag-and-drop | Done |

---

## Sprint 1 — Foundation & dead code cleanup

**Goal:** Remove stale Manus template artifacts; align docs with local auth stack.

**Deliverables:**
- Remove `template.json`, `references/periodic-updates.md`, `client/public/__manus__/`, unused `Map.tsx`
- Rewrite `README.md` for DropHunter (Vite + Express + tRPC + MySQL)
- Update `todo.md` auth notes

**Exit criteria:** No Manus OAuth references in active code paths.

---

## Sprint 2 — PRD & TRD

**Goal:** Formal product and technical specifications for onboarding and architecture reviews.

**Deliverables:**
- [`docs/PRD.md`](./PRD.md) — personas, features, plan matrix, success metrics
- [`docs/TRD.md`](./TRD.md) — stack, routers, auth, billing, data model, deployment

**Exit criteria:** New engineers can onboard from docs without reading the whole codebase.

---

## Sprint 3 — Flagged account enforcement

**Goal:** `flagged` status restricts workspace (not cosmetic).

**Policy:** Flagged users may access **Billing** and **Account** only (same pattern as paused). Admins bypass.

**Deliverables:**
- `assertAccountUsable()` blocks flagged on `protectedProcedure`
- `usePlan` + `Dashboard` redirect flagged users to billing
- Warning banner with `flagReason` when present

**Exit criteria:** Flagged user cannot call search/AI/pipeline APIs; can still manage account and billing.

---

## Sprint 4 — Stripe checkout & webhooks

**Goal:** Paid upgrades via Stripe Checkout; no free DB plan grants when Stripe is configured.

**Deliverables:**
- `stripe` SDK + env vars in `server/_core/env.ts`
- `POST /api/webhooks/stripe` (raw body, signature verification)
- `billing.createCheckoutSession`, `billing.createPortalSession`
- Webhook handlers: `checkout.session.completed`, `customer.subscription.updated/deleted`
- Idempotency table `stripe_webhook_events`
- Billing UI redirects to Checkout when Stripe configured

**Env vars:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_*`, `APP_URL`

**Exit criteria:** Checkout → webhook → user `planId` + `stripeSubscriptionId` updated; `selectPlan` blocked when Stripe active.

---

## Sprint 5 — Discount coupons & admin/billing tests

**Goal:** `discount_percent` coupons create Stripe promotion codes; regression tests for billing/admin.

**Deliverables:**
- `coupon_redemptions.stripePromotionCodeId` column
- Redeem flow creates Stripe promotion code when configured
- Checkout auto-applies user's active discount redemption
- `server/billing.test.ts`, `server/admin.test.ts`, extended `plans.test.ts`

**Exit criteria:** Vitest covers selectPlan gating, coupon redemption, flagged assertion, Stripe config helpers.

---

## Sprint 6 — Pipeline kanban DnD

**Goal:** Drag cards between columns; persist via existing `updatePipelineItem`.

**Deliverables:**
- `@dnd-kit/core` + `@dnd-kit/utilities` on `ProductPipeline.tsx`
- Optimistic stage update on drop
- Keep Select fallback on cards for accessibility

**Exit criteria:** Drag card Testing → Scaling updates DB stage; keyboard users can still use Select.

---

## Enabling production billing

1. Set Stripe env vars (see `.env.example` and `docs/API-ENV-SETUP.md`)
2. Create Products/Prices in Stripe Dashboard; map to `STRIPE_PRICE_*`
3. Register webhook: `https://your-domain/api/webhooks/stripe`
4. Admin → Settings → **Self-serve billing** ON
5. For local webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

**Beta without Stripe:** Self-serve ON + Stripe unset = manual `selectPlan` (admin/coupon upgrades only).

# Stripe Setup Guide — DropHunter AI

Step-by-step guide to enable paid subscriptions with Stripe Checkout and webhooks.

## Prerequisites

- Stripe account: [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
- App running locally: `pnpm dev` (default `http://localhost:3000`)
- Database migrated: `pnpm db:migrate` (includes `stripe_webhook_events` table)

---

## Step 1 — Create products and prices

1. Open [Stripe Dashboard → Products](https://dashboard.stripe.com/test/products)
2. Create one **Product** per paid plan (use **Test mode** toggle top-right while developing):

| Product name | Suggested price | Maps to env var |
|--------------|-----------------|-----------------|
| Starter | $19/mo recurring | `STRIPE_PRICE_STARTER` |
| Pro | $49/mo recurring | `STRIPE_PRICE_PRO` |
| Business | $99/mo recurring | `STRIPE_PRICE_BUSINESS` |
| Agency | $199/mo recurring | `STRIPE_PRICE_AGENCY` |

3. For each product, add a **Recurring** price (monthly)
4. Copy each **Price ID** (starts with `price_...`) — not the Product ID

---

## Step 2 — Get API keys

1. [Developers → API keys](https://dashboard.stripe.com/test/apikeys)
2. Copy:
   - **Publishable key** → `STRIPE_PUBLISHABLE_KEY` (starts with `pk_test_`)
   - **Secret key** → `STRIPE_SECRET_KEY` (starts with `sk_test_`)

---

## Step 3 — Configure `.env`

Uncomment and fill in your `.env`:

```env
APP_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...          # from Step 4
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...
STRIPE_PRICE_AGENCY=price_...
```

Restart the dev server after saving.

---

## Step 4 — Webhooks (local development)

Stripe must notify your app when checkout completes. Locally, use the **Stripe CLI**.

### Install Stripe CLI (Windows)

```powershell
# Option A: Scoop
scoop install stripe

# Option B: Download installer
# https://github.com/stripe/stripe-cli/releases/latest
```

### Forward webhooks to your app

```powershell
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI prints a webhook signing secret like `whsec_...` — paste that into `STRIPE_WEBHOOK_SECRET` in `.env` and restart `pnpm dev`.

Keep the `stripe listen` terminal open while testing checkout.

### Events the app handles

- `checkout.session.completed` — activates plan after payment
- `customer.subscription.updated` — syncs status changes
- `customer.subscription.deleted` — marks subscription cancelled

---

## Step 5 — Enable self-serve billing in admin

1. Sign in as admin (`pnpm tsx scripts/create-admin.ts` if needed)
2. Go to **Admin → Settings**
3. Turn on **Self-serve billing**
4. Save

Without this toggle, users cannot start checkout even if Stripe is configured.

---

## Step 6 — Test the flow

1. Start app: `pnpm dev`
2. Start webhook forwarder: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. Sign in as a regular user → **Billing → All plans**
4. Click **Subscribe to Pro** (or any paid plan)
5. Use Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC
6. After redirect, webhook should update plan within a few seconds
7. Refresh billing page — plan should show as active

### Test discount coupons

1. Admin → Coupons → create `discount_percent` coupon (e.g. 20%)
2. User redeems code on Billing page
3. Start checkout — discount applies automatically if Stripe is configured

---

## Step 7 — Production deployment

1. Switch Stripe Dashboard to **Live mode**
2. Recreate products/prices in live mode (or copy from test)
3. Set live API keys and price IDs in production env (Vercel/hosting)
4. Register webhook endpoint in [Developers → Webhooks](https://dashboard.stripe.com/webhooks):
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
5. Copy live `whsec_...` to `STRIPE_WEBHOOK_SECRET`
6. Set `APP_URL=https://your-domain.com`
7. Enable **Self-serve billing** in admin

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Use secure checkout" on plan change | Expected when Stripe is configured — use Subscribe button |
| Plan not updating after payment | Check `stripe listen` is running; verify `STRIPE_WEBHOOK_SECRET` matches CLI output |
| Webhook 400 Invalid signature | Wrong `STRIPE_WEBHOOK_SECRET` or body parsed before raw route |
| "Stripe price not configured" | Missing `STRIPE_PRICE_*` for that plan in `.env` |
| Checkout button disabled | Enable self-serve billing in Admin → Settings |

---

## Beta mode (no Stripe)

Leave Stripe vars unset. Enable **Self-serve billing** in admin → users pick plans instantly (no payment). Use coupons and admin overrides for upgrades.

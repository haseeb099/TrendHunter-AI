# DropHunter / TrendHunter — Full Project Audit & Sprint Roadmap (A→Z)

**Audit date:** June 10, 2026  
**Launch hardening pass:** June 12, 2026 — see [`LAUNCH-AUDIT-2026-06.md`](./LAUNCH-AUDIT-2026-06.md) and [`LAUNCH-CHECKLIST.md`](./LAUNCH-CHECKLIST.md)  
**Scope:** Entire codebase, docs (`PRD`, `TRD`, `SPRINT-ROADMAP`, `API-ENV-SETUP`), tests, deployment, and product completeness.  
**Health check:** Run `pnpm check && pnpm test` before deploy (CI enforces on PR/push).

This document extends [`SPRINT-ROADMAP.md`](./SPRINT-ROADMAP.md) (Sprints 1–6, done) with a full audit and a forward roadmap through production launch and beyond.

> **June 12 launch hardening (Phases 1–15):** Full pass completed. Subscription gating via `protectedBase` is **fixed** (B-01). CI, Helmet, password reset, Google OAuth, Docker Stripe env, truth layer badges, provider cache-only defaults, DB indexes, and expanded tests shipped. Automated verification: `pnpm check`, 210 unit tests, `pnpm build`, `pnpm test:e2e` all pass. Remaining launch risks: lifecycle emails, optional Redis for multi-instance rate limits, `self_serve_billing` off by default. Use [`LAUNCH-CHECKLIST.md`](./LAUNCH-CHECKLIST.md) for deploy.

> **Research Engine (S15.5–S25):** Shipped and documented in [`SPRINT-ROADMAP.md`](./SPRINT-ROADMAP.md). The sprints below in **Phase C (S16B–S18B)** are a **parallel Business track** — admin MRR, agent polish, Google OAuth — renamed to avoid collision with Research Engine S16–S25.

---

## 1. Executive summary

DropHunter is a **feature-rich MVP** with a complete workspace (Discover → Validate → Competitors → Pipeline → Billing), admin console, plan enforcement, and Stripe billing. Sprints 1–6 delivered foundation cleanup, formal docs, account enforcement, payments, coupons, and pipeline drag-and-drop.

**What works well today**

| Area | Status |
|------|--------|
| Core workspace (12 tabs) | Built & wired |
| Auth (email/password, JWT cookie) | Working |
| Plan gating (server + client) | Working |
| Admin (users, plans, coupons, settings, audit) | Working |
| Stripe Checkout + webhooks + idempotency | Working |
| Server unit tests (210+) | Passing |
| Docker prod compose + migrations on boot | Working |

**Top risks before public launch** *(updated June 12 — many June 10 items resolved)*

1. ~~**Subscription `isActive` is cosmetic**~~ — **Fixed** via `protectedBase` + `assertSubscriptionActive`.
2. ~~**No CI/CD**~~ — **Fixed** — `.github/workflows/ci.yml`.
3. **No transactional lifecycle email** — password reset works; trial/payment emails still missing.
4. **In-memory rate limits without Redis** — document single-instance or set `REDIS_URL`.
5. ~~**Agency tier unbuilt features**~~ — removed from marketing copy; orgs remain non-goal.
6. **Self-serve billing defaults off** — enable in Admin → Settings before launch (see launch checklist).

---

## 2. Project map (A→Z)

```
A  Auth & sessions          ✅ Email/password, JWT cookie, role admin/user
B  Billing & Stripe         ✅ Checkout, portal, webhooks, coupons (5 types)
C  Competitor Spy           ✅ AI analysis (needs API key)
D  Discover / Search        ✅ Multi-provider + mock fallback
E  Environment & APIs        ✅ Documented in API-ENV-SETUP.md
F  Filter presets           ✅ Pro+ feature, SearchFilterDrawer
G  Groq / OpenAI AI         ✅ Validation, agent, social, market gap
H  Home / landing           ✅ Pricing, features, trending teaser
I  Image uploads            ✅ Local disk + optional S3
J  JWT / session security   ⚠️  No refresh rotation, no 2FA
K  Kanban pipeline          ✅ DnD + Select fallback (S6)
L  Limits & quotas          ✅ Searches, AI, pipeline, watchlist
M  Maintenance mode         ✅ Admin toggle blocks protected routes
N  Notifications            ❌ No email/push
O  OAuth / social login     ❌ Removed (S1); openId field remains
P  Plans catalog            ✅ DB-backed, admin-editable
Q  Quotas & usage events    ✅ user_events table
R  Rate limiting            ⚠️  Auth only, in-memory
S  Stripe webhooks          ✅ Signature verify + idempotency table
T  Trending feed            ✅ Cached snapshots, demo fallback
U  User account states      ✅ active / paused / flagged / deactivated
V  Validate (AI scoring)    ✅ Standalone page + side-panel
W  Watchlist                ✅ Drawer workspace integration
X  (e)Xport / reports       ❌ Not built (claimed on Agency plan)
Y  Yield / analytics        ✅ Basic + analytics_advanced gate
Z  Zero-downtime deploy     ⚠️  Single-container; no blue/green
```

---

## 3. Audit findings

### 3.1 Bugs (fix before launch)

| ID | Severity | Issue | Location | Recommended fix |
|----|----------|-------|----------|-----------------|
| B-01 | **High** | Expired trial / cancelled subscription users retain **Starter API access** while Billing UI says “subscription inactive.” `assertFeatureAccess` never checks `isActive`. | `server/plans.ts`, `Billing.tsx` | Enforce `isActive` in `protectedBase` or `assertFeatureAccess`; OR intentionally grant freemium Starter and fix Billing copy. Decide product policy first. |
| B-02 | **Medium** | Trial expiry runs **only on server startup** (`expireStaleTrials()` in `index.ts`), not on a schedule. Long-running processes miss expirations until restart. | `server/_core/index.ts` | Add hourly cron (node-cron / external scheduler) or check expiry lazily in `resolveEffectivePlan`. |
| B-03 | **Medium** | `AdminCouponsTab` still labels `discount_percent` as “For future Stripe checkout” — **implemented in S5**. | `client/src/pages/admin/AdminCouponsTab.tsx` | Update hint to “Creates Stripe promotion code at checkout.” |
| B-04 | **Medium** | `docker-compose.prod.yml` omits **all Stripe env vars** — production Docker deploy cannot process payments. | `docker-compose.prod.yml` | Add `STRIPE_*`, `APP_URL`, `GROQ_API_KEY` passthrough. |
| B-05 | **Low** | E2E script defaults to port **3005**; dev server defaults to **3000**. | `scripts/e2e-api-test.ts` | Align default or document in README. |
| B-06 | **Low** | `expireStaleTrials` sets `planStatus: expired` but does not change `planId` from `trial` — confusing admin reports. | `server/plans.ts` | Optionally set `planId: starter` or add explicit `trial_expired` handling in admin UI. |

### 3.2 Product gaps (PRD vs reality)

| Gap | PRD reference | Current state | Sprint |
|-----|---------------|---------------|--------|
| Agency “Multi-client workspaces” | Implied in Agency plan copy | Not built; PRD lists orgs as **non-goal** | S16B or remove from marketing |
| Agency “White-label export” | Agency plan features | No export endpoints or UI | S14 |
| User self-service password reset | Expected SaaS baseline | Admin-only `resetPassword` | S8 |
| Email verification on register | Industry standard | None | S8 |
| Trial-ending / payment-failed emails | Success metrics / churn | None | S9 |
| ProductSource / BuyWhere APIs | API-ENV-SETUP “not wired yet” | Not integrated | S12 |
| Shopify native search | Landing/marketing mentions | SerpAPI/eBay/free catalogs only | S12 |
| P&L “real” store sync | PRD non-goal | Manual analytics only | Future / out of scope |

### 3.3 Technical debt

| Item | Notes | Sprint |
|------|-------|--------|
| `openId` + `loginMethod` columns | Legacy from Manus OAuth template; local auth uses `nanoid()` openId | S7 cleanup |
| `ComponentShowcase.tsx` | ~1400 lines, **not routed** in `App.tsx` | S7 — delete or gate behind dev route |
| `dist/` artifacts in working tree | `.gitignore` covers it; ensure never committed | S7 |
| `server/_core/oauth.ts` | Deleted (good) but references may linger in docs | Verify |
| Duplicate path separators in git status (`client\` vs `client/`) | Windows checkout noise | Normalize on commit |
| 50 MB `express.json` limit | DoS surface on unauthenticated routes | S10 — lower default, per-route limits |
| No ESLint | Only Prettier in `package.json` | S7 |
| Stripe webhook handler formatting | Excessive blank lines in `stripeWebhooks.ts` | S7 — format pass |

### 3.4 Security & compliance

| Item | Status | Sprint |
|------|--------|--------|
| Password hashing | ✅ bcrypt via `password.ts` | — |
| `passwordHash` never exposed | ✅ `toPublicUser` | — |
| Stripe webhook signature | ✅ Raw body + verify | — |
| Admin procedure gating | ✅ `adminProcedure` | — |
| Auth rate limit (IP + email) | ⚠️ In-memory only | S10 |
| Security headers (Helmet) | ❌ | S10 |
| CORS explicit policy | ❌ Same-origin only by default | S10 if API split |
| CSRF for cookie auth | ⚠️ tRPC POST from same origin — OK for SPA; document threat model | S10 |
| Audit log for user actions | ✅ Admin actions only; no user self-audit | S11 |
| GDPR export / delete account | ❌ | S11 |
| 2FA | ❌ | S18B |

### 3.5 Testing gaps

| Area | Server tests | Client tests | Sprint |
|------|-------------|--------------|--------|
| Auth register/login | Partial (`auth.logout`) | None | S7 |
| AI routers (validate, agent, social, competitor, marketgap) | **None** | None | S7 |
| Stripe webhooks (integration) | Config helpers only | N/A | S9 |
| Billing checkout flow (mock Stripe) | Partial | None | S9 |
| Plan middleware edge cases | Good (`plans.test.ts`) | N/A | — |
| E2E API script | Manual (`pnpm test:e2e`) | N/A | S7 — wire to CI |
| Playwright / browser E2E | None | None | S13 |

### 3.6 DevOps & deployment gaps

| Item | Status | Sprint |
|------|--------|--------|
| GitHub Actions CI | ❌ No `.github/` | S7 |
| Preview deployments | ❌ | S15 |
| Health endpoint beyond Docker HEALTHCHECK | ❌ | S10 |
| Structured logging (JSON) | Console only | S10 |
| Error monitoring (Sentry) | ❌ | S10 |
| DB backups documented | ❌ | S15 |
| Secrets rotation guide | Partial in API-ENV-SETUP | S15 |

### 3.7 UX, accessibility & polish

| Item | Notes | Sprint |
|------|-------|--------|
| Pipeline DnD keyboard | Select fallback exists; no `KeyboardSensor` for drag | S13 |
| Demo data transparency | `ProviderStatusBar` + `isDemo` flag — good; ensure all AI pages show when using mock | S11 |
| Mobile sidebar / drawers | Responsive shell exists; audit touch targets | S13 |
| i18n | English only | S19 |
| Dark/light theme | ✅ switchable | — |
| Loading / empty states | ✅ per todo.md | — |
| Flagged account banner | ✅ `flagReason` in layout | — |
| Paused account UX | Redirects to billing; banner could explain `pausedUntil` date | S11 |

---

## 4. Completed sprints (reference)

| Sprint | Theme | Status |
|--------|-------|--------|
| **S1** | Foundation & dead code cleanup | ✅ Done |
| **S2** | PRD & TRD | ✅ Done |
| **S3** | Flagged account enforcement | ✅ Done |
| **S4** | Stripe checkout + webhooks | ✅ Done |
| **S5** | Discount coupons + billing tests | ✅ Done |
| **S6** | Pipeline kanban drag-and-drop | ✅ Done |

See [`SPRINT-ROADMAP.md`](./SPRINT-ROADMAP.md) for deliverables and exit criteria.

---

## 5. Forward sprint roadmap

Each sprint is **independently shippable**. Priority order reflects launch readiness.

### Phase A — Launch blockers (S7–S10)

#### Sprint 7 — CI, quality gate & cleanup
**Goal:** Every PR runs test + typecheck; remove dead code.

**Deliverables:**
- GitHub Actions: `pnpm install`, `pnpm check`, `pnpm test`
- Delete or dev-gate `ComponentShowcase.tsx`
- Add ESLint (typescript-eslint) with CI step
- Fix B-03 (coupon hint), B-05 (e2e port doc)
- Tests: `auth.register`, `auth.login` smoke tests
- Tests: at least one `aiProcedure` router (validate) with mocked LLM

**Exit criteria:** PR cannot merge with failing tests or `tsc`.

---

#### Sprint 8 — Account recovery & email foundation
**Goal:** Users can recover access without admin intervention.

**Deliverables:**
- `auth.forgotPassword` + `auth.resetPassword` (token table, expiry)
- Email provider abstraction (Resend / SMTP via env)
- Register optional email verification toggle (admin setting)
- Transactional templates: password reset, welcome

**Exit criteria:** User completes forgot-password flow end-to-end in staging.

---

#### Sprint 9 — Billing hardening & subscription truth
**Goal:** Fix B-01; Stripe lifecycle is airtight.

**Deliverables:**
- **Product decision:** expired trial → Starter freemium OR hard paywall — implement consistently server + client
- Lazy trial expiry in `resolveEffectivePlan` (fixes B-02 without cron)
- Stripe webhook tests with fixture payloads (`checkout.session.completed`, `subscription.deleted`)
- Handle `invoice.payment_failed` → flag or pause account
- Add Stripe vars to `docker-compose.prod.yml` (B-04)
- Billing UI sync with enforced `isActive` policy

**Exit criteria:** Cancelled Stripe sub cannot call `searchProcedure`; trial expiry reflected within 1 request.

---

#### Sprint 10 — Production security & observability
**Goal:** Operate safely at scale.

**Deliverables:**
- Redis-backed rate limits (Upstash or self-hosted) replacing in-memory map
- `GET /api/health` (DB ping, Stripe configured flag)
- Helmet security headers
- Sentry (or similar) server + client error boundaries
- Structured JSON logs in production
- Reduce default body parser limit; document upload route limits

**Exit criteria:** Two app replicas share rate-limit state; health check used by orchestrator.

---

### Phase B — Growth & data quality (S11–S14)

#### Sprint 11 — Trust, transparency & compliance
**Goal:** Users understand data sources; basic compliance.

**Deliverables:**
- Global “demo data” banner when `isDemo` on search/trending/suppliers
- Paused account banner with `pausedUntil` date
- `auth.exportMyData` (JSON download)
- `auth.deleteAccount` (soft-delete + anonymize)
- User-facing activity log (searches, AI calls this month)

**Exit criteria:** GDPR-style export returns watchlist + pipeline + profile.

---

#### Sprint 12 — Search & supplier depth
**Goal:** Reduce mock fallback; align marketing with capabilities.

**Deliverables:**
- Wire ProductSource or BuyWhere (per API-ENV-SETUP priority)
- Shopify Catalog API or SerpAPI Shopify engine (pick one)
- Supplier offer refresh button + staleness indicator
- `scripts/verify-search.ts` in CI nightly (optional workflow)
- Update landing copy to match live providers

**Exit criteria:** With keys configured, Discover returns `isDemo: false` for at least 2 platforms.

---

#### Sprint 13 — UX, a11y & browser E2E
**Goal:** Keyboard-accessible pipeline; critical path E2E.

**Deliverables:**
- `@dnd-kit` `KeyboardSensor` on pipeline board
- Playwright: register → search → add watchlist → checkout mock
- Accessibility pass on Login, Dashboard nav, Billing (focus order, labels)
- Touch target audit on mobile

**Exit criteria:** Pipeline stage change works via keyboard; Playwright green in CI.

---

#### Sprint 14 — Export & reporting
**Goal:** Deliver Agency-adjacent value without full multi-tenancy.

**Deliverables:**
- Export watchlist / pipeline as CSV
- Export validation report as PDF or printable HTML
- Analytics date-range filter + CSV export
- Remove or qualify “white-label export” Agency copy until branded PDF lands

**Exit criteria:** Pro+ user downloads pipeline CSV with all columns.

---

### Phase C — Platform & scale (S15–S18B)

> **Research Engine complete:** S15.5–S25 (product graph, discovery queue, ranking v2, trust panels, ingest ops) — see [`SPRINT-ROADMAP.md`](./SPRINT-ROADMAP.md). Remaining Phase C items below are the **Business track (S16B–S18B)**.

#### Sprint 15 — Deployment & ops
**Goal:** Repeatable production deploys.

**Deliverables:**
- Vercel or VPS deploy guide (extend TRD §8)
- GitHub Actions deploy on tag
- MySQL backup/runbook doc
- Environment promotion checklist (staging → prod)
- `pnpm test:e2e` in CI against ephemeral DB

**Exit criteria:** Fresh server + `.env` → running app in &lt;30 min following docs only.

---

#### Sprint 16B — Admin & analytics depth
**Goal:** Operators run the business from Admin.

**Deliverables:**
- Admin revenue dashboard (Stripe MRR via API or webhook aggregates)
- Cohort chart: trial → paid conversion
- Bulk user actions (pause, grant plan)
- Coupon analytics (redemptions, revenue attributed)
- Churn list (cancelled subs last 30 days)

**Exit criteria:** Admin sees MRR and trial conversion without Stripe Dashboard.

---

#### Sprint 17B — AI agent upgrades
**Goal:** Agent becomes a true research copilot.

**Deliverables:**
- Tool calling: search products, add to watchlist, run validation from chat
- Cite sources in agent responses (product URLs)
- Session title auto-generation
- Token usage tracking per user (align with `aiCallsPerMonth`)

**Exit criteria:** User asks “find pet grooming products under $30” → agent returns live search summary.

---

#### Sprint 18B — Authentication expansion
**Goal:** Reduce signup friction; enterprise-ready auth.

**Deliverables:**
- Google OAuth (optional, admin toggle)
- 2FA TOTP for admin accounts
- Session list + revoke
- “Remember this device” long-lived session option

**Exit criteria:** Admin enables Google login; new users can sign in with Google.

---

### Phase D — Vision features (S19+)

#### Sprint 19 — Internationalization & regions
- i18n framework (en → es/de/fr)
- Currency display per region
- Region-specific fee defaults in profit calculator

#### Sprint 20 — Team & agency (PRD non-goal today — revisit)
- Organizations table, invite flow, seat limits on Business/Agency
- Shared pipeline per org
- Role: owner / member / viewer

#### Sprint 21 — Integrations
- Zapier/webhooks on pipeline stage change
- Slack notification on watchlist price drop (needs price tracking job)
- Shopify/WooCommerce product import

#### Sprint 22 — Mobile PWA
- Service worker, offline watchlist view
- Push notifications for trial expiry

---

## 6. Priority matrix

| Priority | Sprints | Theme |
|----------|---------|-------|
| **P0 — Launch** | S7, S9, S10 | CI, subscription enforcement, security |
| **P1 — Trust** | S8, S11 | Email, compliance, demo transparency |
| **P1 — Quality** | S12, S13 | Live data, E2E, a11y |
| **P2 — Revenue** | S14, S16B | Export, admin revenue analytics |
| **P2 — Ops** | S15 | Deploy automation |
| **P3 — Differentiation** | S17B, S18B | AI agent tools, OAuth/2FA |
| **P4 — Vision** | S19–S22 | i18n, teams, integrations, PWA |

---

## 7. Production launch checklist

Use this after **S7 + S9 + S10** minimum.

- [ ] `JWT_SECRET` — 32+ random bytes, unique per environment
- [ ] `DATABASE_URL` — managed MySQL with backups
- [ ] Stripe live keys + webhook registered to `https://<domain>/api/webhooks/stripe`
- [ ] `APP_URL` matches public URL (Checkout redirect)
- [ ] Admin → Settings → self-serve billing ON
- [ ] At least one search provider live (eBay or SerpAPI)
- [ ] `OPENAI_API_KEY` or `GROQ_API_KEY` for AI features
- [ ] S3 configured for uploads OR accept local disk risk
- [ ] CI green on main branch
- [ ] B-01 policy implemented and tested
- [ ] Error monitoring receiving events
- [ ] `pnpm tsx scripts/create-admin.ts` — break-glass admin exists
- [ ] Legal: Terms, Privacy Policy pages (not built — add to S11)

---

## 8. Environment quick reference

| Tier | Keys | Enables |
|------|------|---------|
| P0 | `DATABASE_URL`, `JWT_SECRET` | App + auth |
| P0b | `FREE_RETAIL_ENABLED`, `SHOPTERA_ENABLED` | Free search |
| P1 | `EBAY_*`, `SERPAPI_KEY` | Live marketplace |
| P2 | `SERPAPI_*`, `DEFAULT_REGION` | Trending by region |
| P3 | `OPENAI_API_KEY` / `GROQ_API_KEY` | AI modules |
| P4 | `CJ_*`, `ALIEXPRESS_*` | Live supplier offers |
| P5 | `STRIPE_*`, `APP_URL` | Paid subscriptions |
| P5 | `S3_*` | Durable uploads |

Full detail: [`API-ENV-SETUP.md`](./API-ENV-SETUP.md) · Stripe: [`STRIPE-SETUP.md`](./STRIPE-SETUP.md)

---

## 9. How to maintain this document

1. When a sprint ships, move it to §4 (completed) in `SPRINT-ROADMAP.md` and mark ✅ here.
2. When a bug is fixed, strike through its ID in §3.1 or remove it.
3. Re-run audit quarterly: `pnpm test`, `pnpm check`, review `todo.md`, scan for new `mock` fallbacks.
4. Align Agency/Pro marketing copy with `shared/plans.ts` feature IDs — no feature in copy without a `featureId` or doc caveat.

---

## 10. Related documents

| Document | Purpose |
|----------|---------|
| [`SPRINT-ROADMAP.md`](./SPRINT-ROADMAP.md) | Shipped sprints S1–S25 (Research Engine S15.5–S25) |
| [`PRD.md`](./PRD.md) | Product requirements |
| [`TRD.md`](./TRD.md) | Technical architecture |
| [`API-ENV-SETUP.md`](./API-ENV-SETUP.md) | All environment variables |
| [`STRIPE-SETUP.md`](./STRIPE-SETUP.md) | Stripe configuration |
| [`todo.md`](../todo.md) | Original build checklist (Phase 1–7 complete) |

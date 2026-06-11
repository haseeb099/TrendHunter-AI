# Synthetic badge QA checklist

Manual visual QA for `DataFreshnessBadge` with `synthetic` prop per [DATA-TRUTH-CONTRACT.md](./DATA-TRUTH-CONTRACT.md). Each surface that returns AI-generated analysis (not live marketplace catalog data) must show the **AI-generated** badge.

## How to verify

1. Sign in with a plan that includes the feature.
2. Open the page and trigger the AI flow (generate / analyze / chat).
3. Confirm a badge appears with label **AI-generated** (sparkles icon, outline variant).
4. When a live toggle exists, confirm cached/live intel panels still show **Cached** / **Live** — not synthetic.

## Surfaces

| Surface | Route / location | Badge expected | QA status |
|---------|------------------|----------------|-------------|
| Market Gap Finder | `/dashboard` → Market Gap tab | `synthetic` when gaps shown | [ ] Verified |
| Product Validation | Product drawer → Validation panel | `synthetic` on AI validation output | [ ] Verified |
| AI Research Agent | `/dashboard` → Agent tab | `synthetic` in page header area | [ ] Verified |
| Social Media Kit | `/dashboard` → Social tab | `synthetic` on generated kit | [ ] Verified |
| Competitor Spy | `/dashboard` → Competitor tab → AI intel | `synthetic` when analysis results shown | [ ] Verified |
| Social Kit live toggle | Social tab with live refresh on | `live` or `cached` on intel panels, not synthetic | [ ] Verified |

## Optional follow-ups

| Surface | Notes | QA status |
|---------|-------|-----------|
| Agent tool responses | Inline "AI-generated" in chat bubbles for tool-backed answers | [ ] Optional |
| Competitor Spy — Trend Pulse / Ad Radar | Cached intel sub-panels use `DataFreshnessBadge` via panel components | [ ] Verified |

## Regression guard

- Any new AI-only feature must add `DataFreshnessBadge synthetic` (or document why N/A).
- Run `pnpm test` — component tests cover trust drawer panels; server golden tests cover ranking.

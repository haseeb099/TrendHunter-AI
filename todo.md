# DropHunter AI — Project TODO

## Phase 1: Foundation
- [x] Design system: colors, typography, global CSS variables (dark premium theme)
- [x] Database schema: products, saved_searches, watchlist, pipeline, chat_sessions, chat_messages, suppliers, competitor_data
- [x] Server routers: search, validate, competitor, profit, supplier, social, marketgap, analytics, agent, pipeline
- [x] Google Fonts (Inter + Sora) in index.html

## Phase 2: Landing Page & Auth & Dashboard Shell
- [x] Elegant landing page with hero, features grid, pricing tiers, CTA
- [x] Auth flow (email/password login + JWT session)
- [x] Dashboard with sidebar: Search, Validate, Competitors, Profit Calc, Suppliers, Social Kit, Market Gap, Analytics, AI Agent, Pipeline
- [x] User profile / settings page

## Phase 3: Product Search & AI Validation
- [x] Multi-platform product search UI (eBay, Amazon, Shopify, TikTok Shop tabs)
- [x] Search filters: niche, category, price range, shipping origin, platform
- [x] Product result cards with image, price, platform badge, shipping time
- [x] Save to watchlist / pipeline actions
- [x] AI Validation page: score breakdown (trend, saturation, profit, supplier)
- [x] Demand trajectory chart (via recharts)
- [x] Saturation meter and competitor count
- [x] AI validation report generation via LLM

## Phase 4: Competitor Spy, Profit Calculator, Supplier Vetting
- [x] Competitor spy: enter URL or keyword, analyze listings
- [x] Competitor pricing table, review sentiment, sales velocity estimate
- [x] Ad spend estimator display
- [x] Advanced profit calculator: product cost, shipping, platform fees, ad spend, VAT/duties
- [x] Real profit formula with break-even ad spend and ROI %
- [x] Platform comparison (eBay vs Amazon vs Shopify vs TikTok)
- [x] Supplier vetting dashboard: location, shipping times, MOQ, reliability score
- [x] Sample order tracker
- [x] Supplier diversification suggester

## Phase 5: Social Media Kit, Market Gap Finder, Analytics
- [x] Social media kit: AI hashtag generator (30+ tags)
- [x] Ad copy template generator
- [x] TikTok/Instagram caption generator
- [x] UGC video script generator
- [x] Market gap finder: cross-reference demand vs supply
- [x] Underserved niche suggestions with AI
- [x] Emerging trend detector display
- [x] Analytics dashboard: trend charts (recharts)
- [x] P&L tracker by product/platform/time
- [x] Saved product pipeline metrics

## Phase 6: AI Agent Chat & Pipeline Tracker
- [x] AI Agent chat interface (using AIChatBox component + LLM streaming)
- [x] Agent tools: product research, sourcing advice, campaign ideation
- [x] Chat session persistence (DB)
- [x] Product pipeline tracker: kanban-style board (Testing, Scaling, Paused, Dropped)
- [x] Pipeline cards with product info, test results, notes
- [x] Watchlist page with saved products

## Phase 7: Polish & Tests
- [x] Micro-interactions and animations throughout
- [x] Loading skeletons for all data-heavy pages
- [x] Empty states for all lists
- [x] Responsive design (mobile-first)
- [x] Vitest unit tests for all server routers
- [x] Final checkpoint and delivery

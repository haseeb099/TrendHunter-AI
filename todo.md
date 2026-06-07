# DropHunter AI — Project TODO

## Phase 1: Foundation
- [x] Design system: colors, typography, global CSS variables (dark premium theme)
- [x] Database schema: products, saved_searches, watchlist, pipeline, chat_sessions, chat_messages, suppliers, competitor_data
- [x] Server routers: search, validate, competitor, profit, supplier, social, marketgap, analytics, agent, pipeline
- [x] Google Fonts (Inter + Sora) in index.html

## Phase 2: Landing Page & Auth & Dashboard Shell
- [x] Elegant landing page with hero, features grid, pricing tiers, CTA
- [x] Auth flow (login/logout via Manus OAuth)
- [x] Dashboard with sidebar: Search, Validate, Competitors, Profit Calc, Suppliers, Social Kit, Market Gap, Analytics, AI Agent, Pipeline
- [ ] User profile / settings page

## Phase 3: Product Search & AI Validation
- [x] Multi-platform product search UI (eBay, Amazon, Shopify, TikTok Shop tabs)
- [x] Search filters: niche, category, price range, shipping origin, platform
- [x] Product result cards with image, price, platform badge, shipping time
- [x] Save to watchlist / pipeline actions
- [x] AI Validation page: score breakdown (trend, saturation, profit, supplier)
- [ ] Demand trajectory chart
- [ ] Saturation meter and competitor count
- [x] AI validation report generation via LLM

## Phase 4: Competitor Spy, Profit Calculator, Supplier Vetting
- [x] Competitor spy: enter URL or keyword, analyze listings
- [ ] Competitor pricing table, review sentiment, sales velocity estimate
- [ ] Ad spend estimator display
- [x] Advanced profit calculator: product cost, shipping, platform fees, ad spend, VAT/duties
- [x] Real profit formula with break-even ad spend and ROI %
- [ ] Platform comparison (eBay vs Amazon vs Shopify vs TikTok)
- [x] Supplier vetting dashboard: location, shipping times, MOQ, reliability score
- [ ] Sample order tracker
- [ ] Supplier diversification suggester

## Phase 5: Social Media Kit, Market Gap Finder, Analytics
- [ ] Social media kit: AI hashtag generator (30+ tags)
- [ ] Ad copy template generator
- [ ] TikTok/Instagram caption generator
- [ ] UGC video script generator
- [ ] Market gap finder: cross-reference demand vs supply
- [ ] Underserved niche suggestions with AI
- [ ] Emerging trend detector display
- [ ] Analytics dashboard: trend charts (recharts)
- [ ] P&L tracker by product/platform/time
- [ ] Saved product pipeline metrics

## Phase 6: AI Agent Chat & Pipeline Tracker
- [ ] AI Agent chat interface (using AIChatBox component + LLM streaming)
- [ ] Agent tools: product research, sourcing advice, campaign ideation
- [ ] Chat session persistence (DB)
- [ ] Product pipeline tracker: kanban-style board (Testing, Scaling, Paused, Dropped)
- [ ] Pipeline cards with product info, test results, notes
- [ ] Watchlist page with saved products

## Phase 7: Polish & Tests
- [ ] Micro-interactions and animations throughout
- [ ] Loading skeletons for all data-heavy pages
- [ ] Empty states for all lists
- [ ] Responsive design (mobile-first)
- [ ] Vitest unit tests for all server routers
- [x] Final checkpoint and delivery

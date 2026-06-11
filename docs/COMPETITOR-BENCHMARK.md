# Competitor Benchmark — TrendHunter Research Engine

Manual positioning matrix vs typical dropshipping research tools (no automated scraping).

## Discovery flow

| Dimension | Typical tools | TrendHunter (S17+) |
|-----------|---------------|---------------------|
| Query source | User seed keywords | Autonomous `discovery_queue` from trends, ads, behavior |
| Overnight expansion | Manual re-search | Rising queries + adjacent variants ingested daily |
| Coverage | Single marketplace focus | Multi-provider graph with canonical dedupe |

## Ranking explainability

| Dimension | Typical tools | TrendHunter (S18+) |
|-----------|---------------|---------------------|
| Score visibility | Opaque sort / popularity | `rankingExplanation` + `TrendScoreExplain` on Search + Discover |
| Signal transparency | Hidden heuristics | 10-signal decision engine v2 with confidence tier |
| Query robustness | Exact-string sensitivity | Synonym equivalence + stability checks |

## Category & regional depth

| Dimension | Typical tools | TrendHunter (S20) |
|-----------|---------------|---------------------|
| Regions | US-only default | US, UK, EU, GLOBAL ingest |
| Category routing | Generic search | Category-aware provider priority |
| Supplier depth | Link-out only | CJ + AliExpress with confidence tiers |

## Trust & workflow

| Dimension | Typical tools | TrendHunter (S21+) |
|-----------|---------------|---------------------|
| Why / what changed / next | Separate research steps | Six drawer trust panels per product |
| Data honesty | Mixed live/cached | DATA-TRUTH badges + provenance on cards |
| Zero results | Dead end | Recovery suggestions from discovery queue |

## Positioning statement

TrendHunter is a **decision-oriented research engine** — not just a search box. It compounds intelligence daily through autonomous query expansion, explains every ranking with multi-signal fusion (including TikTok), and closes the loop from discovery → validation → pipeline with explicit trust UX.

## Internal quality targets (S23 dashboard)

| Metric | Target |
|--------|--------|
| Snapshots &lt; 24h | ≥ 90% |
| Avg providers per query | ≥ 3 |
| Zero-result rate | &lt; 10% |
| Results with explanation | 100% |
| Rank stability (query pairs) | ≥ 95% |

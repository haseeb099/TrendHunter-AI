/** Topics the AI Research Agent is allowed to discuss (TrendHunter / DropHunter scope). */
export const AGENT_ALLOWED_TOPICS = [
  "E-commerce & online shopping",
  "Product research & discovery",
  "Suppliers & sourcing",
  "Competitor analysis",
  "Product validation & viability",
  "Profit, margin & landed-cost math",
  "Market trends for sellable products",
  "Ads & go-to-market for products",
] as const;

export const AGENT_SCOPE_SUMMARY =
  "E-commerce product research only — suppliers, competitors, validation, and profit math.";

export const AGENT_OFF_TOPIC_REPLY = `I'm scoped to **TrendHunter product research** only. I can help with:

- Finding and comparing products to sell online
- Supplier sourcing and vetting
- Competitor and market analysis
- Product validation scores and demand signals
- Profit, margin, and landed-cost calculations
- Dropshipping, TikTok Shop, Amazon, and marketplace strategy

Please ask something in that space, or use **Discover**, **Intel Center**, or **Profit Calculator** elsewhere in the app.`;

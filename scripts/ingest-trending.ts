/**
 * Trending-only ingest cycle — fills region × category queue (respects hourly API cap).
 * Runs automatically every hour when the server is up; use for manual refresh:
 *   pnpm ingest:trending
 */
import "dotenv/config";
import { runTrendingIngestCycle } from "../server/ingest/trendingCycle";

runTrendingIngestCycle("manual")
  .then((result) => {
    console.log("[ingest-trending] Done:", JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error("[ingest-trending] Fatal:", err);
    process.exit(1);
  });

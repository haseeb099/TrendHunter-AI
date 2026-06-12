/**
 * Daily data ingest — run via GitHub Actions cron or: pnpm ingest:daily
 */
import "dotenv/config";
import { runDailyIngest } from "../server/ingest/daily";

runDailyIngest()
  .then((result) => {
    console.log("[ingest-daily] Done:", JSON.stringify(result, null, 2));
    const fatal =
      Object.keys(result.apiCounts).length === 0 ||
      result.errors.some(
        (e) =>
          e.includes("DATABASE") ||
          e.includes("ECONNREFUSED") ||
          e.includes("Access denied for user")
      );
    if (fatal) {
      console.error("[ingest-daily] Fatal — no data ingested or database unreachable");
      process.exit(1);
    }
    if (result.errors.length > 0) {
      console.warn(`[ingest-daily] Completed with ${result.errors.length} non-fatal error(s)`);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error("[ingest-daily] Fatal:", err);
    process.exit(1);
  });

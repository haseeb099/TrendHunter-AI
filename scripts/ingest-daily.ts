/**
 * Daily data ingest — run via GitHub Actions cron or: pnpm ingest:daily
 */
import "dotenv/config";
import { runDailyIngest } from "../server/ingest/daily";

runDailyIngest()
  .then((result) => {
    console.log("[ingest-daily] Done:", JSON.stringify(result, null, 2));
    if (result.errors.length > 0 && Object.keys(result.apiCounts).length === 0) {
      process.exit(1);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error("[ingest-daily] Fatal:", err);
    process.exit(1);
  });

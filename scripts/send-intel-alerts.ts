/**
 * Send rising-keyword alerts + daily intel digests.
 * Runs automatically after daily ingest, or standalone: pnpm intel:alerts
 */
import "dotenv/config";
import { processRisingKeywordAlerts, sendDailyIntelDigests } from "../server/intelligence/alertJobs";

async function main() {
  const alerts = await processRisingKeywordAlerts();
  console.log("[intel-alerts] Rising alerts:", alerts);

  const digests = await sendDailyIntelDigests();
  console.log("[intel-alerts] Digests:", digests);
}

main().catch((err) => {
  console.error("[intel-alerts] Fatal:", err);
  process.exit(1);
});

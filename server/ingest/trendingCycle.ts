import { createLogger } from "../_core/logger";
import { pruneDuplicateTrendingSnapshots } from "../db";
import { resetIngestLiveBudget, getIngestLiveBudgetRemaining } from "./liveBudget";
import {
  getTrendingQueueStats,
  processTrendingIngestQueue,
  seedTrendingIngestQueue,
} from "./trendingQueue";

const log = createLogger("trending-cycle");

/** Hourly (or manual) trending ingest — respects per-hour API cap and fills queue over time. */
export async function runTrendingIngestCycle(trigger: string) {
  log.info("trending_cycle_start", { trigger });

  resetIngestLiveBudget();
  const pruned = await pruneDuplicateTrendingSnapshots();
  const seeded = await seedTrendingIngestQueue();
  const result = await processTrendingIngestQueue();
  const stats = await getTrendingQueueStats();

  log.info("trending_cycle_complete", {
    trigger,
    pruned,
    seeded,
    processed: result.processed,
    skipped: result.skipped,
    budgetRemaining: getIngestLiveBudgetRemaining(),
    hourlyUsage: result.hourlyUsage,
    queue: stats,
    errorCount: result.errors.length,
  });

  return {
    pruned,
    seeded,
    ...result,
    queue: stats,
  };
}

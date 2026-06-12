import { ENV } from "../_core/env";
import { createLogger } from "../_core/logger";
import { runDailyIngest } from "./daily";
import { runFreeProviderIngestCycle } from "./freeProviderCycle";
import { runSerperIngestCycle } from "./serperCycle";
import { runTrendingIngestCycle } from "./trendingCycle";

const log = createLogger("ingest-scheduler");

let dailyRunning = false;
let trendingRunning = false;
let trendingIntervalHandle: ReturnType<typeof setInterval> | null = null;
let dailyIntervalHandle: ReturnType<typeof setInterval> | null = null;

async function runScheduledTrending(trigger: "startup" | "hourly"): Promise<void> {
  if (trendingRunning) {
    log.info("trending_cycle_skipped_already_running", { trigger });
    return;
  }
  trendingRunning = true;
  try {
    await runFreeProviderIngestCycle(trigger);
    await runSerperIngestCycle(trigger);
    await runTrendingIngestCycle(trigger);
  } catch (err) {
    log.error("trending_cycle_failed", {
      trigger,
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    trendingRunning = false;
  }
}

async function runScheduledDaily(trigger: "startup" | "daily"): Promise<void> {
  if (dailyRunning) {
    log.info("daily_ingest_skipped_already_running", { trigger });
    return;
  }
  dailyRunning = true;
  try {
    log.info("daily_ingest_scheduler_start", { trigger });
    const result = await runDailyIngest();
    log.info("daily_ingest_scheduler_complete", {
      trigger,
      runId: result.runId,
      errorCount: result.errors.length,
    });
  } catch (err) {
    log.error("daily_ingest_scheduler_failed", {
      trigger,
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    dailyRunning = false;
  }
}

/**
 * Starts automatic ingest on the app server:
 * - Trending queue every INGEST_TRENDING_INTERVAL_HOURS (default 1h), respects hourly API cap
 * - Full intel/catalog ingest every INGEST_FULL_INTERVAL_HOURS (default 24h)
 */
export function startIngestScheduler(): void {
  if (!ENV.ingestSchedulerEnabled) {
    log.info("ingest_scheduler_disabled");
    return;
  }

  const trendingMs = ENV.ingestTrendingIntervalHours * 60 * 60 * 1000;
  const dailyMs = ENV.ingestFullIntervalHours * 60 * 60 * 1000;
  const startupDelayMs = ENV.ingestStartupDelayMinutes * 60 * 1000;

  log.info("ingest_scheduler_armed", {
    trendingIntervalHours: ENV.ingestTrendingIntervalHours,
    fullIntervalHours: ENV.ingestFullIntervalHours,
    startupDelayMinutes: ENV.ingestStartupDelayMinutes,
    liveSearchBudgetPerCycle: ENV.ingestLiveSearchBudget,
    hourlyLiveSearchCap: ENV.ingestHourlyLiveSearchBudget,
    ingestRegions: ENV.ingestRegions.join(","),
  });

  setTimeout(() => {
    void runScheduledTrending("startup");
  }, startupDelayMs);

  trendingIntervalHandle = setInterval(() => {
    void runScheduledTrending("hourly");
  }, trendingMs);

  dailyIntervalHandle = setInterval(() => {
    void runScheduledDaily("daily");
  }, dailyMs);
}

export function stopIngestScheduler(): void {
  if (trendingIntervalHandle) {
    clearInterval(trendingIntervalHandle);
    trendingIntervalHandle = null;
  }
  if (dailyIntervalHandle) {
    clearInterval(dailyIntervalHandle);
    dailyIntervalHandle = null;
  }
}

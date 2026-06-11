import type { Express, Request, Response } from "express";
import { ENV } from "./env";
import { runDailyIngest } from "../ingest/daily";
import { createLogger } from "./logger";
import { discoveryQueue, ingestRuns } from "../../drizzle/schema";
import { desc } from "drizzle-orm";
import { getIngestRetryStatus, processIngestRetries } from "../ingest/ingestRetries";
import { getAllProviderHealth } from "./providerHealth";
import { getDb } from "../db";

const log = createLogger("ingest");

function authorizeIngest(req: Request): boolean {
  const headerSecret = req.headers["x-ingest-secret"];
  const secret =
    (typeof headerSecret === "string" ? headerSecret : "") ||
    (typeof req.body?.secret === "string" ? req.body.secret : "");
  return Boolean(ENV.ingestSecret && secret === ENV.ingestSecret);
}

export function registerIngestRoutes(app: Express): void {
  app.post("/api/ingest/daily", async (req: Request, res: Response) => {
    if (!authorizeIngest(req)) {
      log.warn("ingest_unauthorized", { ip: req.ip });
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      log.info("ingest_manual_trigger");
      const result = await runDailyIngest();
      res.json({ ok: true, ...result });
    } catch (err) {
      log.error("ingest_manual_failed", {
        error: err instanceof Error ? err.message : "unknown",
      });
      res.status(500).json({
        error: err instanceof Error ? err.message : "Ingest failed",
      });
    }
  });

  app.get("/api/ingest/status", async (req: Request, res: Response) => {
    if (!authorizeIngest(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const db = await getDb();
    const lastRun = db
      ? (
          await db
            .select()
            .from(ingestRuns)
            .orderBy(desc(ingestRuns.startedAt))
            .limit(1)
        )[0]
      : null;

    const retries = await getIngestRetryStatus();
    const providerHealth = await getAllProviderHealth();
    const queueRows = db
      ? await db.select().from(discoveryQueue).orderBy(desc(discoveryQueue.createdAt)).limit(100)
      : [];
    const discovery = {
      pending: queueRows.filter((r) => r.status === "pending").length,
      running: queueRows.filter((r) => r.status === "running").length,
      done: queueRows.filter((r) => r.status === "done").length,
      failed: queueRows.filter((r) => r.status === "failed").length,
      recent: queueRows.slice(0, 20).map((r) => ({
        query: r.query,
        region: r.region,
        source: r.source,
        status: r.status,
        priority: r.priority,
      })),
    };

    res.json({
      ok: true,
      lastRun: lastRun
        ? {
            id: lastRun.id,
            status: lastRun.status,
            apiCounts: lastRun.apiCounts,
            errors: lastRun.errors,
            startedAt: lastRun.startedAt,
            completedAt: lastRun.completedAt,
          }
        : null,
      discovery,
      retries,
      providerHealth,
    });
  });

  app.post("/api/ingest/retry", async (req: Request, res: Response) => {
    if (!authorizeIngest(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const result = await processIngestRetries();
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Retry failed",
      });
    }
  });
}

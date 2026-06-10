import type { Express, Request, Response } from "express";
import { ENV } from "./env";
import { runDailyIngest } from "../ingest/daily";

export function registerIngestRoutes(app: Express): void {
  app.post("/api/ingest/daily", async (req: Request, res: Response) => {
    const headerSecret = req.headers["x-ingest-secret"];
    const secret =
      (typeof headerSecret === "string" ? headerSecret : "") ||
      (typeof req.body?.secret === "string" ? req.body.secret : "");

    if (!ENV.ingestSecret || secret !== ENV.ingestSecret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const result = await runDailyIngest();
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error("[Ingest] Manual trigger failed:", err);
      res.status(500).json({
        error: err instanceof Error ? err.message : "Ingest failed",
      });
    }
  });
}

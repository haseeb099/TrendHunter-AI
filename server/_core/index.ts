/**
 * Server entry point — Express + tRPC bootstrap.
 * Implemented and updated by Cursor — June 13, 2026 (Notion B-02 hourly trial maintenance).
 */
import "dotenv/config";
import * as Sentry from "@sentry/node";
import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerStorageRoutes } from "./storageRoutes";
import { serveStatic, setupVite } from "./vite";
import { ENV } from "./env";
import { runMigrationsOnStartup } from "./migrate";
import { validateEnvOnStartup } from "./validateEnv";
import { registerStripeRoutes } from "../stripeRoutes";
import { registerOAuthRoutes } from "./oauthRoutes";
import { registerIngestRoutes } from "./ingestRoutes";
import { startIngestScheduler } from "../ingest/scheduler";
import { expireStaleTrials } from "../plans";
import { notifyTrialsEndingSoon } from "../notifications/lifecycleJobs";
import { buildSitemapXml } from "../seo/sitemap";
import { createLogger } from "./logger";

const log = createLogger("server");

if (ENV.sentryDsn) {
  Sentry.init({
    dsn: ENV.sentryDsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: ENV.isProduction ? 0.1 : 1.0,
  });
  log.info("Sentry initialized");
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  validateEnvOnStartup();

  if (ENV.databaseUrl) {
    try {
      await runMigrationsOnStartup();
      if (!ENV.isProduction) {
        log.info("Migrations up to date");
      }
    } catch (err) {
      log.error("Migration failed — session and billing may break until you run db:migrate", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const runTrialMaintenance = () => {
    expireStaleTrials().catch((err) => log.warn("expireStaleTrials failed", { error: String(err) }));
    notifyTrialsEndingSoon().catch((err) =>
      log.warn("notifyTrialsEndingSoon failed", { error: String(err) })
    );
  };

  runTrialMaintenance();
  const TRIAL_MAINTENANCE_INTERVAL_MS = 60 * 60 * 1000; // hourly (Notion B-02)
  setInterval(runTrialMaintenance, TRIAL_MAINTENANCE_INTERVAL_MS);

  const app = express();
  const server = createServer(app);
  app.use(
    helmet({
      contentSecurityPolicy: ENV.isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  );
  registerStripeRoutes(app);
  registerOAuthRoutes(app);
  // 8mb supports ~5mb file uploads via base64 in tRPC (routers uploadFile cap)
  app.use(express.json({ limit: "8mb" }));
  registerIngestRoutes(app);
  app.use(express.urlencoded({ limit: "8mb", extended: true }));
  registerStorageRoutes(app);
  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const xml = await buildSitemapXml();
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(xml);
    } catch (err) {
      log.error("Sitemap generation failed", { error: err instanceof Error ? err.message : String(err) });
      res.status(500).send("Sitemap unavailable");
    }
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  if (ENV.sentryDsn) {
    Sentry.setupExpressErrorHandler(app);
  }

  const preferredPort = ENV.port;
  let port = preferredPort;

  if (ENV.isProduction) {
    port = await findAvailablePort(preferredPort);
    if (port !== preferredPort) {
      log.warn(`Port ${preferredPort} busy, using ${port}`);
    }
  } else if (!(await isPortAvailable(preferredPort))) {
    log.error(
      `Port ${preferredPort} is already in use. Stop the other process (or close stale dev servers) and restart.`,
      { hint: `On Windows: netstat -ano | findstr :${preferredPort}` }
    );
    process.exit(1);
  }

  server.listen(port, () => {
    log.info("Server listening", { port, url: `http://localhost:${port}/` });
    startIngestScheduler();
  });
}

startServer().catch((err) => {
  log.error("Server failed to start", { error: err instanceof Error ? err.message : String(err) });
  if (ENV.sentryDsn) Sentry.captureException(err);
  console.error(err);
});

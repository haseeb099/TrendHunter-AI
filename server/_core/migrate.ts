import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import { ENV } from "./env";

export async function runMigrationsOnStartup(): Promise<void> {
  if (!ENV.databaseUrl) return;

  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  // Bundled server lives in dist/index.js; dev source is server/_core/migrate.ts
  const root = path.basename(moduleDir) === "dist"
    ? path.resolve(moduleDir, "..")
    : path.resolve(moduleDir, "../..");
  const migrationsFolder = path.join(root, "drizzle");

  const connection = await mysql.createConnection(ENV.databaseUrl);
  const db = drizzle(connection);

  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await connection.end();
  }
}

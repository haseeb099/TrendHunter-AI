import "dotenv/config";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const maxAttempts = 30;
const delayMs = 2000;

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  try {
    const connection = await mysql.createConnection(databaseUrl);
    await connection.ping();
    await connection.end();
    process.exit(0);
  } catch {
    if (attempt === maxAttempts) {
      console.error("Database not reachable after maximum retries");
      process.exit(1);
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

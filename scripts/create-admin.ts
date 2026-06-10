/**
 * Create or promote a super-admin user.
 * Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... pnpm tsx scripts/create-admin.ts
 */
import "dotenv/config";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users } from "../drizzle/schema";
import { hashPassword } from "../server/_core/password";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const db = drizzle(process.env.DATABASE_URL);
const now = new Date();

const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
const passwordHash = hashPassword(password);

if (existing.length > 0) {
  const user = existing[0]!;
  await db
    .update(users)
    .set({
      role: "admin",
      passwordHash,
      accountStatus: "active",
      planId: "agency",
      planStatus: "active",
      flagReason: null,
      pausedUntil: null,
      name: user.name ?? "Super Admin",
      lastSignedIn: now,
    })
    .where(eq(users.id, user.id));
  console.log(`Updated existing user #${user.id} (${email}) to admin.`);
} else {
  const openId = nanoid();
  await db.insert(users).values({
    openId,
    email,
    name: "Super Admin",
    passwordHash,
    loginMethod: "local",
    role: "admin",
    planId: "agency",
    planStatus: "active",
    accountStatus: "active",
    hasUsedTrial: true,
    planStartedAt: now,
    lastSignedIn: now,
  });
  console.log(`Created admin account: ${email}`);
}

process.exit(0);

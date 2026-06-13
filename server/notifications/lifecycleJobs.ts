/**
 * Scheduled lifecycle notification jobs.
 * Implemented and updated by Cursor — June 13, 2026 (Notion S9 scaffold).
 */
import { users } from "../../drizzle/schema";
import { and, eq, gt, isNotNull, lte } from "drizzle-orm";
import { createLogger } from "../_core/logger";
import { countUserEvents, getDb, recordUserEvent } from "../db";
import { sendTrialEndingEmail } from "./lifecycleEmails";

const log = createLogger("lifecycle-jobs");

const TRIAL_ENDING_EVENT = "lifecycle_trial_ending";
const TRIAL_ENDING_WINDOW_DAYS = 3;

/** Notify trial users whose trial ends within the next 3 days (once per trial). */
export async function notifyTrialsEndingSoon(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + TRIAL_ENDING_WINDOW_DAYS);

  const candidates = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.planId, "trial"),
        eq(users.planStatus, "active"),
        isNotNull(users.trialEndsAt),
        gt(users.trialEndsAt, now),
        lte(users.trialEndsAt, windowEnd)
      )
    );

  for (const user of candidates) {
    if (!user.email) continue;

    const alreadySent = await countUserEvents(user.id, TRIAL_ENDING_EVENT);
    if (alreadySent > 0) continue;

    const trialEnd = user.trialEndsAt ? new Date(user.trialEndsAt) : windowEnd;
    const msLeft = trialEnd.getTime() - now.getTime();
    const daysLeft = Math.max(1, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    const name = user.name ?? user.email.split("@")[0] ?? "there";

    const ok = await sendTrialEndingEmail(user.email, name, daysLeft);
    if (ok) {
      await recordUserEvent(user.id, TRIAL_ENDING_EVENT, {
        daysLeft,
        trialEndsAt: trialEnd.toISOString(),
      });
    }
  }

  if (candidates.length > 0) {
    log.info("trial_ending_batch_complete", { checked: candidates.length });
  }
}

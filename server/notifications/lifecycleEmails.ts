/**
 * Lifecycle email templates and senders.
 * Implemented and updated by Cursor — June 13, 2026 (Notion S9 scaffold).
 */
import { ENV } from "../_core/env";
import { createLogger } from "../_core/logger";
import { sendEmail, isEmailConfigured } from "./email";

const log = createLogger("lifecycle-email");

function billingUrl(): string {
  const base = ENV.appUrl.replace(/\/$/, "");
  return `${base}/dashboard/billing`;
}

function dashboardUrl(): string {
  const base = ENV.appUrl.replace(/\/$/, "");
  return `${base}/dashboard`;
}

export function buildWelcomeEmail(name: string): { subject: string; html: string; text: string } {
  const subject = "Welcome to TrendHunter — your trial is active";
  const text = `Hi ${name},\n\nWelcome to TrendHunter! Your Pro trial is now active.\n\nStart discovering trending products: ${dashboardUrl()}\n\nWhen you're ready to subscribe: ${billingUrl()}\n\n— The TrendHunter team`;
  const html = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #111;">
  <p>Hi ${name},</p>
  <p>Welcome to <strong>TrendHunter</strong>! Your Pro trial is now active.</p>
  <p><a href="${dashboardUrl()}" style="display: inline-block; padding: 10px 18px; background: #111; color: #fff; text-decoration: none; border-radius: 6px;">Open dashboard</a></p>
  <p style="font-size: 14px; color: #555;">Manage your subscription anytime from <a href="${billingUrl()}">Billing</a>.</p>
</body>
</html>`;
  return { subject, html, text };
}

export function buildTrialEndingEmail(
  name: string,
  daysLeft: number
): { subject: string; html: string; text: string } {
  const subject = `Your TrendHunter trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
  const text = `Hi ${name},\n\nYour TrendHunter Pro trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.\n\nSubscribe to keep full access: ${billingUrl()}\n\n— The TrendHunter team`;
  const html = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #111;">
  <p>Hi ${name},</p>
  <p>Your <strong>TrendHunter</strong> Pro trial ends in <strong>${daysLeft} day${daysLeft === 1 ? "" : "s"}</strong>.</p>
  <p><a href="${billingUrl()}" style="display: inline-block; padding: 10px 18px; background: #111; color: #fff; text-decoration: none; border-radius: 6px;">Choose a plan</a></p>
  <p style="font-size: 14px; color: #555;">After your trial, you'll move to the free Starter tier unless you subscribe.</p>
</body>
</html>`;
  return { subject, html, text };
}

export function buildPaymentFailedEmail(name: string): { subject: string; html: string; text: string } {
  const subject = "TrendHunter — payment failed, action required";
  const text = `Hi ${name},\n\nWe couldn't process your latest TrendHunter subscription payment.\n\nUpdate your payment method to restore access: ${billingUrl()}\n\n— The TrendHunter team`;
  const html = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #111;">
  <p>Hi ${name},</p>
  <p>We couldn't process your latest <strong>TrendHunter</strong> subscription payment.</p>
  <p><a href="${billingUrl()}" style="display: inline-block; padding: 10px 18px; background: #111; color: #fff; text-decoration: none; border-radius: 6px;">Update payment method</a></p>
  <p style="font-size: 14px; color: #555;">Your account may have limited access until payment is resolved.</p>
</body>
</html>`;
  return { subject, html, text };
}

export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  if (!isEmailConfigured()) {
    log.debug("welcome_skipped_no_email_config", { to });
    return false;
  }
  const { subject, html, text } = buildWelcomeEmail(name);
  const ok = await sendEmail({ to, subject, html, text });
  if (ok) log.info("welcome_sent", { to });
  else log.warn("welcome_failed", { to });
  return ok;
}

export async function sendTrialEndingEmail(
  to: string,
  name: string,
  daysLeft: number
): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  const { subject, html, text } = buildTrialEndingEmail(name, daysLeft);
  const ok = await sendEmail({ to, subject, html, text });
  if (ok) log.info("trial_ending_sent", { to, daysLeft });
  else log.warn("trial_ending_failed", { to, daysLeft });
  return ok;
}

export async function sendPaymentFailedEmail(to: string, name: string): Promise<boolean> {
  if (!isEmailConfigured()) return false;
  const { subject, html, text } = buildPaymentFailedEmail(name);
  const ok = await sendEmail({ to, subject, html, text });
  if (ok) log.info("payment_failed_sent", { to });
  else log.warn("payment_failed_failed", { to });
  return ok;
}

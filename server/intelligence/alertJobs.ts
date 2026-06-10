import { eq } from "drizzle-orm";
import type { RegionCode } from "@shared/searchTypes";
import { ENV } from "../_core/env";
import {
  getAllDigestPrefs,
  getAllKeywordWatches,
  updateKeywordWatchLabel,
  markDigestSent,
  getUserById,
} from "../db";
import { buildMarketDigest } from "./marketDigest";
import { getTrendSignal } from "./trends";
import { sendEmail } from "../notifications/email";
import { recordUserEvent } from "../db";

type RisingAlert = {
  userId: number;
  email: string;
  keyword: string;
  region: string;
  previousLabel: string | null;
};

export async function processRisingKeywordAlerts(): Promise<{
  checked: number;
  alerted: number;
}> {
  const watches = await getAllKeywordWatches();
  const alerts: RisingAlert[] = [];

  for (const watch of watches) {
    if (!watch.alertOnRising) continue;

    const signal = await getTrendSignal(
      watch.keyword,
      watch.region as RegionCode,
      { live: false }
    );
    const currentLabel = signal?.momentumLabel ?? null;
    const prev = watch.lastMomentumLabel;

    if (currentLabel === "rising" && prev !== "rising") {
      const user = await getUserById(watch.userId);
      if (user?.email) {
        alerts.push({
          userId: watch.userId,
          email: user.email,
          keyword: watch.keyword,
          region: watch.region,
          previousLabel: prev,
        });
      }
      await recordUserEvent(watch.userId, "intel_alert", {
        keyword: watch.keyword,
        region: watch.region,
        momentumLabel: currentLabel,
        previousLabel: prev,
      });
    }

    if (currentLabel !== prev) {
      await updateKeywordWatchLabel(watch.id, watch.userId, currentLabel);
    }
  }

  let sent = 0;
  for (const alert of alerts) {
    const ok = await sendEmail({
      to: alert.email,
      subject: `Rising trend: ${alert.keyword}`,
      html: `
        <h2>Keyword is now rising</h2>
        <p><strong>${escapeHtml(alert.keyword)}</strong> in ${alert.region} flipped to <strong>rising</strong> on Google Trends.</p>
        <p>Previous status: ${alert.previousLabel ?? "unknown"}</p>
        <p><a href="${ENV.appUrl}/dashboard/trendpulse?keyword=${encodeURIComponent(alert.keyword)}&region=${alert.region}">View in DropHunter</a></p>
      `,
    });
    if (ok) sent++;
  }

  return { checked: watches.length, alerted: sent };
}

export async function sendDailyIntelDigests(): Promise<{ users: number; sent: number }> {
  if (!ENV.intelDigestEnabled) {
    return { users: 0, sent: 0 };
  }

  const prefsList = await getAllDigestPrefs();
  let sent = 0;

  for (const prefs of prefsList) {
    if (!prefs.enabled) continue;

    const user = await getUserById(prefs.userId);
    if (!user?.email) continue;

    const region = (prefs.region ?? "US") as RegionCode;
    const digest = await buildMarketDigest(region, prefs.category);
    const rising = digest.rising.slice(0, 8);
    const opportunities = digest.opportunities.slice(0, 5);

    if (rising.length === 0 && opportunities.length === 0) continue;

    const categoryLine = prefs.category
      ? `<p>Category filter: <strong>${escapeHtml(prefs.category)}</strong></p>`
      : "";

    const risingHtml =
      rising.length > 0
        ? `<h3>Rising search demand</h3><ul>${rising
            .map(
              (r) =>
                `<li><strong>${escapeHtml(r.keyword)}</strong> — score ${Math.round(r.momentumScore ?? 0)}${r.changePercent90d != null ? ` (${r.changePercent90d > 0 ? "+" : ""}${r.changePercent90d}% / 90d)` : ""}</li>`
            )
            .join("")}</ul>`
        : "";

    const oppHtml =
      opportunities.length > 0
        ? `<h3>Opportunities (rising + fewer ads)</h3><ul>${opportunities
            .map(
              (o) =>
                `<li><strong>${escapeHtml(o.keyword)}</strong> — ${o.activeAdCount ?? 0} Meta ads</li>`
            )
            .join("")}</ul>`
        : "";

    const ok = await sendEmail({
      to: user.email,
      subject: `DropHunter daily intel — ${region}${prefs.category ? ` · ${prefs.category}` : ""}`,
      html: `
        <h2>Your market intelligence digest</h2>
        <p>Region: <strong>${region}</strong></p>
        ${categoryLine}
        ${risingHtml}
        ${oppHtml}
        <p><a href="${ENV.appUrl}/dashboard/intel">Open Intel Center</a></p>
      `,
    });

    if (ok) {
      await markDigestSent(prefs.userId);
      sent++;
    }
  }

  return { users: prefsList.length, sent };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

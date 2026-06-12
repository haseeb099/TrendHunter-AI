import { ENV } from "../_core/env";

let remaining = 0;
let hourlyUsed = 0;
let hourKey = "";

function currentHourKey(): string {
  return new Date().toISOString().slice(0, 13);
}

function resetHourlyWindowIfNeeded(): void {
  const hk = currentHourKey();
  if (hk !== hourKey) {
    hourKey = hk;
    hourlyUsed = 0;
  }
}

/** Reset per-cycle budget (hourly window persists until the clock hour changes). */
export function resetIngestLiveBudget(max = ENV.ingestLiveSearchBudget): void {
  remaining = Math.max(0, max);
  resetHourlyWindowIfNeeded();
}

export function getIngestLiveBudgetRemaining(): number {
  resetHourlyWindowIfNeeded();
  const hourlyLeft = Math.max(0, ENV.ingestHourlyLiveSearchBudget - hourlyUsed);
  return Math.min(remaining, hourlyLeft);
}

export function getIngestHourlyUsage(): { used: number; cap: number; hourKey: string } {
  resetHourlyWindowIfNeeded();
  return { used: hourlyUsed, cap: ENV.ingestHourlyLiveSearchBudget, hourKey };
}

/** Returns false when cycle or hourly API budget is exhausted. */
export function consumeIngestLiveSearch(count = 1): boolean {
  resetHourlyWindowIfNeeded();
  if (remaining <= 0) return false;
  if (hourlyUsed + count > ENV.ingestHourlyLiveSearchBudget) return false;
  remaining = Math.max(0, remaining - count);
  hourlyUsed += count;
  return true;
}

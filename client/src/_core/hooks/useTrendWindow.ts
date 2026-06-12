import { useCallback, useState } from "react";
import type { TrendWindow } from "@shared/intelligenceTypes";

const STORAGE_KEY = "trendhunter:trendWindow";

export const TREND_WINDOW_LABELS: Record<TrendWindow, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
};

function readWindow(): TrendWindow {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "7d" || raw === "30d" || raw === "90d") return raw;
  } catch {
    /* ignore */
  }
  return "7d";
}

export function useTrendWindow() {
  const [window, setWindowState] = useState<TrendWindow>(readWindow);

  const setWindow = useCallback((next: TrendWindow) => {
    setWindowState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  return { window, setWindow, label: TREND_WINDOW_LABELS[window] };
}

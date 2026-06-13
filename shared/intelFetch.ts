import type { TrendWindow } from "./intelligenceTypes";

/** Controls how intel snapshot getters resolve cache vs provider calls. */
export type IntelFetchOptions = {
  /** User-initiated live refresh — debits credits at router layer. */
  live?: boolean;
  /** Ingest-only: fetch provider on cache miss without debiting credits. Default false. */
  warm?: boolean;
  timeframe?: TrendWindow;
};

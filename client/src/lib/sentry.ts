import * as Sentry from "@sentry/react";

let initialized = false;

export function initSentry(): void {
  const dsn =
    import.meta.env.VITE_SENTRY_DSN?.trim() ||
    import.meta.env.SENTRY_DSN?.trim() ||
    "";
  if (!dsn || initialized) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
  });
  initialized = true;
}

export { Sentry };

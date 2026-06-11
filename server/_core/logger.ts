import { ENV } from "./env";

type LogLevel = "info" | "warn" | "error" | "debug";
type LogMeta = Record<string, unknown>;

function writeLog(level: LogLevel, scope: string, message: string, meta?: LogMeta): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    scope,
    msg: message,
    ...(meta ? { meta } : {}),
  };

  if (ENV.isProduction) {
    const line = JSON.stringify(entry);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
    return;
  }

  const prefix = `[${scope}]`;
  if (level === "error") console.error(prefix, message, meta ?? "");
  else if (level === "warn") console.warn(prefix, message, meta ?? "");
  else console.log(prefix, message, meta ?? "");
}

export function createLogger(scope: string) {
  return {
    info: (message: string, meta?: LogMeta) => writeLog("info", scope, message, meta),
    warn: (message: string, meta?: LogMeta) => writeLog("warn", scope, message, meta),
    error: (message: string, meta?: LogMeta) => writeLog("error", scope, message, meta),
    debug: (message: string, meta?: LogMeta) => writeLog("debug", scope, message, meta),
  };
}

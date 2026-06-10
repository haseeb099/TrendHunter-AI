import type { Request } from "express";
import { TRPCError } from "@trpc/server";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.socket.remoteAddress ?? "unknown";
}

export function assertRateLimit(key: string, maxAttempts: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  bucket.count += 1;
  if (bucket.count > maxAttempts) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many attempts. Please wait a few minutes and try again.",
    });
  }
}

export function assertAuthRateLimit(req: Request, email: string): void {
  const normalizedEmail = email.trim().toLowerCase();
  const ip = getClientIp(req);
  assertRateLimit(`auth:ip:${ip}`, 30, 15 * 60 * 1000);
  assertRateLimit(`auth:email:${normalizedEmail}`, 10, 15 * 60 * 1000);
}

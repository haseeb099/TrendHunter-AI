import type { Express } from "express";
import express from "express";
import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { getLocalUploadsRoot, isS3Configured } from "../storage";
import { verifySessionToken } from "./session";

export function registerStorageRoutes(app: Express) {
  if (isS3Configured()) {
    return;
  }

  const uploadsRoot = getLocalUploadsRoot();

  app.use("/storage", async (req, res, next) => {
    const parsed = parseCookieHeader(req.headers.cookie ?? "");
    const session = await verifySessionToken(parsed[COOKIE_NAME]);
    if (!session) {
      res.status(401).send("Unauthorized");
      return;
    }
    next();
  }, express.static(uploadsRoot));
}

import type { Express } from "express";
import express from "express";
import { getLocalUploadsRoot, isS3Configured } from "../storage";

export function registerStorageRoutes(app: Express) {
  if (isS3Configured()) {
    return;
  }

  const uploadsRoot = getLocalUploadsRoot();
  app.use("/storage", express.static(uploadsRoot));
}

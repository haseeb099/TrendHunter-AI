import type { Express } from "express";
import { handleGoogleCallback, handleGoogleStart } from "./oauth/google";

export function registerOAuthRoutes(app: Express): void {
  app.get("/api/auth/google", (req, res) => {
    void handleGoogleStart(req, res);
  });

  app.get("/api/auth/google/callback", (req, res) => {
    void handleGoogleCallback(req, res);
  });
}

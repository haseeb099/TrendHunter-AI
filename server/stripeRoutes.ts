import express from "express";
import { handleStripeWebhook } from "./stripeWebhooks";

export function registerStripeRoutes(app: express.Application): void {
  app.post(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json" }),
    (req, res) => {
      void handleStripeWebhook(req, res);
    }
  );
}

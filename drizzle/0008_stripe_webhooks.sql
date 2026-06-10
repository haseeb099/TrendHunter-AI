CREATE TABLE IF NOT EXISTS `stripe_webhook_events` (
  `id` int AUTO_INCREMENT NOT NULL,
  `eventId` varchar(255) NOT NULL,
  `eventType` varchar(128) NOT NULL,
  `processedAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `stripe_webhook_events_id` PRIMARY KEY(`id`),
  CONSTRAINT `stripe_webhook_events_eventId_unique` UNIQUE(`eventId`)
);--> statement-breakpoint
ALTER TABLE `coupon_redemptions` ADD `stripePromotionCodeId` varchar(255);

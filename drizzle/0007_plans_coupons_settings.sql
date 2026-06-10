CREATE TABLE `plan_configs` (
  `planId` enum('trial','starter','pro','business','agency') NOT NULL,
  `name` varchar(128) NOT NULL,
  `tagline` text,
  `priceMonthly` float NOT NULL DEFAULT 0,
  `priceLabel` varchar(32) NOT NULL DEFAULT 'Free',
  `billingPeriod` varchar(64) NOT NULL DEFAULT 'per month',
  `highlight` boolean NOT NULL DEFAULT false,
  `isActive` boolean NOT NULL DEFAULT true,
  `sortOrder` int NOT NULL DEFAULT 0,
  `trialDays` int DEFAULT 3,
  `features` json NOT NULL,
  `featureIds` json NOT NULL,
  `limits` json NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `plan_configs_planId` PRIMARY KEY(`planId`)
);--> statement-breakpoint
CREATE TABLE `platform_settings` (
  `key` varchar(64) NOT NULL,
  `value` json NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `platform_settings_key` PRIMARY KEY(`key`)
);--> statement-breakpoint
CREATE TABLE `coupons` (
  `id` int AUTO_INCREMENT NOT NULL,
  `code` varchar(32) NOT NULL,
  `description` text,
  `couponType` enum('grant_plan','extend_trial','extend_subscription','bonus_searches','discount_percent') NOT NULL,
  `value` float NOT NULL,
  `grantPlanId` enum('trial','starter','pro','business','agency'),
  `maxRedemptions` int NOT NULL DEFAULT -1,
  `redemptionCount` int NOT NULL DEFAULT 0,
  `expiresAt` timestamp NULL,
  `isActive` boolean NOT NULL DEFAULT true,
  `createdByUserId` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
  CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);--> statement-breakpoint
CREATE TABLE `coupon_redemptions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `couponId` int NOT NULL,
  `userId` int NOT NULL,
  `redeemedAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `coupon_redemptions_id` PRIMARY KEY(`id`)
);

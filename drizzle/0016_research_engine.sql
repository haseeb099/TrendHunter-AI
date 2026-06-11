CREATE TABLE IF NOT EXISTS `discovery_queue` (
  `id` int AUTO_INCREMENT NOT NULL,
  `query` varchar(255) NOT NULL,
  `platform` varchar(32) NOT NULL DEFAULT 'all',
  `region` varchar(16) NOT NULL,
  `priority` float NOT NULL DEFAULT 0.5,
  `source` varchar(32) NOT NULL,
  `parentQuery` varchar(255),
  `status` varchar(16) NOT NULL DEFAULT 'pending',
  `scheduledAt` timestamp NOT NULL DEFAULT (now()),
  `completedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `discovery_queue_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `product_features` (
  `id` int AUTO_INCREMENT NOT NULL,
  `canonicalProductId` varchar(36) NOT NULL,
  `region` varchar(16) NOT NULL,
  `keyword` varchar(255),
  `momentumScore` float,
  `adSaturationScore` float,
  `tiktokPressureScore` float,
  `supplierScore` float,
  `competitionScore` float,
  `freshnessScore` float,
  `computedAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `product_features_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ingest_retries` (
  `id` int AUTO_INCREMENT NOT NULL,
  `provider` varchar(64) NOT NULL,
  `operation` varchar(128) NOT NULL,
  `payload` json,
  `attempts` int NOT NULL DEFAULT 0,
  `maxAttempts` int NOT NULL DEFAULT 5,
  `nextRetryAt` timestamp NOT NULL DEFAULT (now()),
  `lastError` text,
  `status` varchar(16) NOT NULL DEFAULT 'pending',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `ingest_retries_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ranking_configs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `version` varchar(16) NOT NULL DEFAULT 'v2',
  `region` varchar(16),
  `weights` json NOT NULL,
  `isActive` boolean NOT NULL DEFAULT true,
  `updatedAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `ranking_configs_id` PRIMARY KEY(`id`)
);

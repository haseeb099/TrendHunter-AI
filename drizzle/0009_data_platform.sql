CREATE TABLE IF NOT EXISTS `catalog_products` (
  `id` int AUTO_INCREMENT NOT NULL,
  `externalId` varchar(255) NOT NULL,
  `source` varchar(64) NOT NULL,
  `title` text NOT NULL,
  `price` float NOT NULL,
  `platform` varchar(64) NOT NULL,
  `image` text,
  `rating` float,
  `category` varchar(64),
  `region` varchar(16),
  `currency` varchar(8) DEFAULT 'USD',
  `sourceUrl` text,
  `payload` json,
  `fetchedAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `catalog_products_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `search_snapshots` (
  `id` int AUTO_INCREMENT NOT NULL,
  `query` varchar(255) NOT NULL,
  `platform` varchar(32) NOT NULL,
  `region` varchar(16) NOT NULL,
  `payload` json NOT NULL,
  `sources` json,
  `isDemo` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `expiresAt` timestamp NOT NULL,
  CONSTRAINT `search_snapshots_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `trend_signals` (
  `id` int AUTO_INCREMENT NOT NULL,
  `keyword` varchar(255) NOT NULL,
  `region` varchar(16) NOT NULL,
  `source` varchar(32) NOT NULL,
  `momentumScore` float NOT NULL DEFAULT 0,
  `momentumLabel` varchar(16),
  `changePercent90d` float,
  `interestOverTime` json,
  `relatedQueries` json,
  `risingQueries` json,
  `raw` json,
  `fetchedAt` timestamp NOT NULL DEFAULT (now()),
  `expiresAt` timestamp NOT NULL,
  CONSTRAINT `trend_signals_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ad_library_snapshots` (
  `id` int AUTO_INCREMENT NOT NULL,
  `keyword` varchar(255) NOT NULL,
  `region` varchar(16) NOT NULL,
  `activeAdCount` int NOT NULL DEFAULT 0,
  `advertiserCount` int NOT NULL DEFAULT 0,
  `creatives` json NOT NULL,
  `gaps` json,
  `raw` json,
  `fetchedAt` timestamp NOT NULL DEFAULT (now()),
  `expiresAt` timestamp NOT NULL,
  CONSTRAINT `ad_library_snapshots_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ingest_runs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `status` enum('running','completed','failed') NOT NULL,
  `apiCounts` json,
  `errors` json,
  `startedAt` timestamp NOT NULL DEFAULT (now()),
  `completedAt` timestamp,
  CONSTRAINT `ingest_runs_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `api_usage_daily` (
  `id` int AUTO_INCREMENT NOT NULL,
  `provider` varchar(64) NOT NULL,
  `usageDate` varchar(10) NOT NULL,
  `callCount` int NOT NULL DEFAULT 0,
  CONSTRAINT `api_usage_daily_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_credits` (
  `userId` int NOT NULL,
  `balance` int NOT NULL DEFAULT 0,
  `monthlyAllowance` int NOT NULL DEFAULT 0,
  `resetAt` timestamp,
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `user_credits_userId` PRIMARY KEY(`userId`)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `credit_transactions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `amount` int NOT NULL,
  `type` enum('monthly_grant','purchase','spend','admin_grant','refund') NOT NULL,
  `action` varchar(64),
  `metadata` json,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `credit_transactions_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_output_cache` (
  `id` int AUTO_INCREMENT NOT NULL,
  `cacheKey` varchar(128) NOT NULL,
  `feature` varchar(64) NOT NULL,
  `payload` json NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `expiresAt` timestamp NOT NULL,
  CONSTRAINT `ai_output_cache_id` PRIMARY KEY(`id`),
  CONSTRAINT `ai_output_cache_cacheKey_unique` UNIQUE(`cacheKey`)
);

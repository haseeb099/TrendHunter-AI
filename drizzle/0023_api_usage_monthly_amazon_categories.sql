CREATE TABLE IF NOT EXISTS `api_usage_monthly` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(64) NOT NULL,
	`monthKey` varchar(8) NOT NULL,
	`callCount` int NOT NULL DEFAULT 0,
	CONSTRAINT `api_usage_monthly_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_usage_monthly_provider_month` ON `api_usage_monthly` (`provider`,`monthKey`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `amazon_category_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`region` varchar(16) NOT NULL,
	`country` varchar(8) NOT NULL,
	`categories` json NOT NULL,
	`fetchedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `amazon_category_cache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `amazon_category_cache_region_expires` ON `amazon_category_cache` (`region`,`expiresAt`);

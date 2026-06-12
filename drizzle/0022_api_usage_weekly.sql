CREATE TABLE IF NOT EXISTS `api_usage_weekly` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(64) NOT NULL,
	`weekKey` varchar(16) NOT NULL,
	`callCount` int NOT NULL DEFAULT 0,
	CONSTRAINT `api_usage_weekly_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_usage_weekly_provider_week` ON `api_usage_weekly` (`provider`,`weekKey`);

CREATE TABLE IF NOT EXISTS `api_usage_hourly` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(64) NOT NULL,
	`hourKey` varchar(16) NOT NULL,
	`callCount` int NOT NULL DEFAULT 0,
	CONSTRAINT `api_usage_hourly_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_usage_hourly_provider_hour` ON `api_usage_hourly` (`provider`,`hourKey`);

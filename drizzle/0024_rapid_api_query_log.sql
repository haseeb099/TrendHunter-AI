CREATE TABLE IF NOT EXISTS `rapid_api_query_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(64) NOT NULL,
	`queryKey` varchar(191) NOT NULL,
	`region` varchar(16) NOT NULL DEFAULT 'US',
	`monthKey` varchar(8) NOT NULL,
	`resultCount` int NOT NULL DEFAULT 0,
	`fetchedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rapid_api_query_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rapid_api_query_log_unique` ON `rapid_api_query_log` (`provider`,`queryKey`,`region`,`monthKey`);

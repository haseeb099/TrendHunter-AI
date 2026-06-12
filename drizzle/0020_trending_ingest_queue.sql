CREATE TABLE IF NOT EXISTS `trending_ingest_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`region` varchar(16) NOT NULL,
	`category` varchar(64),
	`priority` float NOT NULL DEFAULT 1,
	`status` enum('pending','running','done','failed') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`lastError` text,
	`nextRetryAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trending_ingest_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `trending_ingest_queue_status_retry` ON `trending_ingest_queue` (`status`,`nextRetryAt`);
--> statement-breakpoint
CREATE INDEX `trending_ingest_queue_region_category` ON `trending_ingest_queue` (`region`,`category`);

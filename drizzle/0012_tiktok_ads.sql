CREATE TABLE IF NOT EXISTS `tiktok_ads_snapshots` (
  `id` int AUTO_INCREMENT NOT NULL,
  `keyword` varchar(255) NOT NULL,
  `region` varchar(16) NOT NULL,
  `activeAdCount` int NOT NULL DEFAULT 0,
  `advertiserCount` int NOT NULL DEFAULT 0,
  `creatives` json NOT NULL,
  `gaps` json,
  `source` varchar(32) NOT NULL DEFAULT 'cached',
  `raw` json,
  `fetchedAt` timestamp NOT NULL DEFAULT (now()),
  `expiresAt` timestamp NOT NULL,
  CONSTRAINT `tiktok_ads_snapshots_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE INDEX `tiktok_ads_keyword_region_idx` ON `tiktok_ads_snapshots` (`keyword`,`region`);

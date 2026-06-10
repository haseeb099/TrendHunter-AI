CREATE TABLE IF NOT EXISTS `intel_keyword_watches` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `keyword` varchar(255) NOT NULL,
  `region` varchar(16) NOT NULL,
  `lastMomentumLabel` varchar(16),
  `alertOnRising` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `intel_keyword_watches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `intel_watches_user_idx` ON `intel_keyword_watches` (`userId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `intel_watches_user_kw_region` ON `intel_keyword_watches` (`userId`, `keyword`, `region`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `intel_digest_prefs` (
  `userId` int NOT NULL,
  `enabled` boolean NOT NULL DEFAULT false,
  `region` varchar(16) NOT NULL DEFAULT 'US',
  `category` varchar(64),
  `lastSentAt` timestamp,
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `intel_digest_prefs_userId` PRIMARY KEY(`userId`)
);

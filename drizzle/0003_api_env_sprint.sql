CREATE TABLE `trending_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`region` varchar(16) NOT NULL,
	`category` varchar(64),
	`payload` json NOT NULL,
	`sources` json,
	`isDemo` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `trending_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_offers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` varchar(255),
	`productTitle` text NOT NULL,
	`supplierPlatform` enum('cj','aliexpress','manual') NOT NULL,
	`supplierSku` varchar(255),
	`warehouse` varchar(64),
	`shipFrom` varchar(8),
	`unitCost` float NOT NULL,
	`shippingCost` float NOT NULL DEFAULT 0,
	`moq` int DEFAULT 1,
	`processingDays` int,
	`shippingDaysMin` int,
	`shippingDaysMax` int,
	`currency` varchar(8) DEFAULT 'USD',
	`raw` json,
	`fetchedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_offers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_filter_presets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`filters` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_filter_presets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `watchlist_items` ADD `region` varchar(16);
--> statement-breakpoint
ALTER TABLE `watchlist_items` ADD `supplierPlatform` varchar(32);
--> statement-breakpoint
ALTER TABLE `watchlist_items` ADD `landedCost` float;
--> statement-breakpoint
ALTER TABLE `pipeline_items` ADD `region` varchar(16);
--> statement-breakpoint
ALTER TABLE `pipeline_items` ADD `supplierPlatform` varchar(32);
--> statement-breakpoint
ALTER TABLE `pipeline_items` ADD `landedCost` float;
--> statement-breakpoint
ALTER TABLE `pipeline_items` ADD `selectedOfferId` int;

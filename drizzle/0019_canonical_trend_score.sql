ALTER TABLE `canonical_products` ADD COLUMN `trendScore` float;--> statement-breakpoint
CREATE INDEX `canonical_products_trendScore_idx` ON `canonical_products` (`trendScore`);

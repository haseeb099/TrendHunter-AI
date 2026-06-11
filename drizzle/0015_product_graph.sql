CREATE TABLE IF NOT EXISTS `canonical_products` (
  `id` varchar(36) NOT NULL,
  `normalizedTitle` varchar(512) NOT NULL,
  `category` varchar(64),
  `priceBand` varchar(16) NOT NULL DEFAULT 'mid',
  `primaryImageUrl` text,
  `listingCount` int NOT NULL DEFAULT 1,
  `firstSeenAt` timestamp NOT NULL DEFAULT (now()),
  `lastSeenAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `canonical_products_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `product_listings` (
  `id` varchar(36) NOT NULL,
  `canonicalProductId` varchar(36) NOT NULL,
  `platform` varchar(64) NOT NULL,
  `externalId` varchar(255) NOT NULL,
  `title` text NOT NULL,
  `price` float NOT NULL,
  `currency` varchar(8) DEFAULT 'USD',
  `region` varchar(16),
  `sourceProvider` varchar(64),
  `sourceUrl` text,
  `fetchedAt` timestamp NOT NULL DEFAULT (now()),
  `payload` json,
  CONSTRAINT `product_listings_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `trending_snapshot_diffs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `region` varchar(16) NOT NULL,
  `category` varchar(64),
  `previousSnapshotId` int,
  `currentSnapshotId` int NOT NULL,
  `addedCanonicalIds` json,
  `removedCanonicalIds` json,
  `scoreDeltas` json,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `trending_snapshot_diffs_id` PRIMARY KEY(`id`)
);

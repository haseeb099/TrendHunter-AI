CREATE TABLE IF NOT EXISTS `saved_social_kits` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `productTitle` varchar(255) NOT NULL,
  `productBenefit` text,
  `region` varchar(16),
  `productId` varchar(128),
  `payload` json NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `saved_social_kits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `saved_social_kits_user_idx` ON `saved_social_kits` (`userId`);

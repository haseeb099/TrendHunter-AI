CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL DEFAULT 'New Chat',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chat_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pipeline_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` varchar(255),
	`productTitle` text NOT NULL,
	`productImage` text,
	`platform` varchar(64),
	`price` float,
	`sourceUrl` text,
	`stage` enum('testing','scaling','paused','dropped') NOT NULL DEFAULT 'testing',
	`validationScore` int,
	`estimatedProfit` float,
	`notes` text,
	`testResults` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pipeline_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profit_calculations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productTitle` text NOT NULL,
	`productCost` float NOT NULL,
	`shippingCost` float NOT NULL DEFAULT 0,
	`platformFee` float NOT NULL DEFAULT 0,
	`adSpend` float NOT NULL DEFAULT 0,
	`vatDuties` float NOT NULL DEFAULT 0,
	`sellingPrice` float NOT NULL,
	`platform` varchar(64),
	`netProfit` float,
	`roi` float,
	`breakEvenAdSpend` float,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `profit_calculations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_searches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`query` varchar(255) NOT NULL,
	`filters` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_searches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`country` varchar(100),
	`platform` varchar(100),
	`shippingDaysMin` int,
	`shippingDaysMax` int,
	`moq` int,
	`reliabilityScore` float,
	`communicationScore` float,
	`qualityScore` float,
	`profileUrl` text,
	`notes` text,
	`sampleOrdered` boolean DEFAULT false,
	`sampleStatus` varchar(64),
	`sampleOrderDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `watchlist_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` varchar(255) NOT NULL,
	`productTitle` text NOT NULL,
	`productImage` text,
	`platform` varchar(64) NOT NULL,
	`price` float,
	`sourceUrl` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `watchlist_items_id` PRIMARY KEY(`id`)
);

ALTER TABLE `users` ADD `planId` enum('trial','starter','pro','business','agency') NOT NULL DEFAULT 'trial';--> statement-breakpoint
ALTER TABLE `users` ADD `planStatus` enum('active','expired','cancelled') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `users` ADD `trialStartedAt` timestamp NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `trialEndsAt` timestamp NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `planStartedAt` timestamp NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `planExpiresAt` timestamp NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `hasUsedTrial` boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(255) NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `stripeSubscriptionId` varchar(255) NULL;--> statement-breakpoint
UPDATE `users` SET `planId` = 'starter', `planStatus` = 'active', `hasUsedTrial` = true WHERE `trialStartedAt` IS NULL;

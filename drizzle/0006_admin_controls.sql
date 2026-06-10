ALTER TABLE `users` ADD `accountStatus` enum('active','deactivated','flagged','paused') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `users` ADD `flagReason` varchar(512) NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `adminNotes` text NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `limitOverrides` json NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `pausedUntil` timestamp NULL;--> statement-breakpoint
CREATE TABLE `admin_audit_log` (
  `id` int AUTO_INCREMENT NOT NULL,
  `adminUserId` int NOT NULL,
  `targetUserId` int NOT NULL,
  `action` varchar(64) NOT NULL,
  `details` json,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `admin_audit_log_id` PRIMARY KEY(`id`)
);

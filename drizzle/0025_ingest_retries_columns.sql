-- Align ingest_retries with application schema (query/platform/region vs legacy operation)
ALTER TABLE `ingest_retries` ADD COLUMN `query` varchar(255);
--> statement-breakpoint
ALTER TABLE `ingest_retries` ADD COLUMN `platform` varchar(32);
--> statement-breakpoint
ALTER TABLE `ingest_retries` ADD COLUMN `region` varchar(16);
--> statement-breakpoint
UPDATE `ingest_retries` SET `query` = `operation` WHERE `query` IS NULL AND `operation` IS NOT NULL;
--> statement-breakpoint
ALTER TABLE `ingest_retries` DROP COLUMN `operation`;

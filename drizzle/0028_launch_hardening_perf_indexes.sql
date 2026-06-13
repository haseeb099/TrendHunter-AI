CREATE INDEX `users_plan_status_idx` ON `users` (`planId`, `planStatus`);
CREATE INDEX `users_account_status_idx` ON `users` (`accountStatus`);
CREATE INDEX `admin_audit_created_idx` ON `admin_audit_log` (`createdAt`);
CREATE INDEX `admin_audit_target_user_idx` ON `admin_audit_log` (`targetUserId`);

ALTER TABLE `credit_transactions` ADD `stripeSessionId` varchar(255);
CREATE INDEX `credit_tx_stripe_session_idx` ON `credit_transactions` (`stripeSessionId`);
CREATE INDEX `credit_tx_user_created_idx` ON `credit_transactions` (`userId`, `createdAt`);
ALTER TABLE `coupon_redemptions` ADD `checkoutConsumedAt` timestamp NULL;
CREATE INDEX `admin_audit_created_idx` ON `admin_audit_log` (`createdAt`);

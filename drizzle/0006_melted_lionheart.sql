CREATE TABLE `owner_login_settings_history` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`ownerAccountId` int NOT NULL,
	`settingsSnapshot` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `owner_login_settings_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `owner_login_settings_history_owner_index` ON `owner_login_settings_history` (`ownerAccountId`,`createdAt`);
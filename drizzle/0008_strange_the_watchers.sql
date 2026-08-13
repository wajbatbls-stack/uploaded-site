CREATE TABLE `site_design_history` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`settingsSnapshot` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `site_design_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `site_design_history_created_index` ON `site_design_history` (`createdAt`);
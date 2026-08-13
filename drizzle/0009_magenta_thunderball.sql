CREATE TABLE `visitor_links` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`token` varchar(80) NOT NULL,
	`name` varchar(160) NOT NULL,
	`targetPath` varchar(255) NOT NULL DEFAULT '/',
	`isActive` boolean NOT NULL DEFAULT true,
	`expiresAt` timestamp,
	`visitCount` int NOT NULL DEFAULT 0,
	`lastVisitedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `visitor_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `visitor_links_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE INDEX `visitor_links_active_index` ON `visitor_links` (`isActive`,`createdAt`);
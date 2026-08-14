CREATE TABLE `partners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`city` varchar(120),
	`description` varchar(1200),
	`kind` enum('جامعة','معهد','جهة تعليمية') NOT NULL DEFAULT 'جامعة',
	`logoUrl` longtext,
	`logoMediaId` bigint,
	`link` varchar(512),
	`isVisible` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`role` varchar(120) NOT NULL,
	`description` varchar(1200),
	`photoUrl` longtext,
	`photoMediaId` bigint,
	`isVisible` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `team_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `partners_sort_index` ON `partners` (`sortOrder`);--> statement-breakpoint
CREATE INDEX `partners_kind_index` ON `partners` (`kind`);--> statement-breakpoint
CREATE INDEX `team_members_sort_index` ON `team_members` (`sortOrder`);
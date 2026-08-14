CREATE TABLE `download_categories` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` longtext,
	`emoji` varchar(16) NOT NULL DEFAULT '📥',
	`color` varchar(32) NOT NULL DEFAULT '#4966d6',
	`backgroundColor` varchar(32) NOT NULL DEFAULT '#eef1fd',
	`imageKey` varchar(512),
	`imageUrl` longtext,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isVisible` boolean NOT NULL DEFAULT true,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `download_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `download_files` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`categoryId` bigint NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`description` longtext,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` longtext NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`sizeBytes` bigint NOT NULL DEFAULT 0,
	`imageKey` varchar(512),
	`imageUrl` longtext,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isVisible` boolean NOT NULL DEFAULT true,
	`downloadCount` bigint NOT NULL DEFAULT 0,
	`lastDownloadedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `download_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `download_categories_order_index` ON `download_categories` (`sortOrder`);--> statement-breakpoint
CREATE INDEX `download_files_category_index` ON `download_files` (`categoryId`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `download_files_visibility_index` ON `download_files` (`isVisible`);
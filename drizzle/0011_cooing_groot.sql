CREATE TABLE `contact_addresses` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`label` varchar(160) NOT NULL,
	`description` longtext,
	`address` varchar(500) NOT NULL,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`imageKey` varchar(512),
	`imageUrl` longtext,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isVisible` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contact_addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contact_emails` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`label` varchar(160) NOT NULL,
	`description` longtext,
	`email` varchar(320) NOT NULL,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`imageKey` varchar(512),
	`imageUrl` longtext,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isVisible` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contact_emails_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contact_mobile_numbers` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`label` varchar(160) NOT NULL,
	`description` longtext,
	`number` varchar(40) NOT NULL,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`imageKey` varchar(512),
	`imageUrl` longtext,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isVisible` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contact_mobile_numbers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contact_socials` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`platform` varchar(80) NOT NULL,
	`platformName` varchar(120) NOT NULL,
	`link` longtext NOT NULL,
	`username` varchar(160),
	`displayMode` varchar(40) NOT NULL DEFAULT 'icon',
	`shape` varchar(40) NOT NULL DEFAULT 'circle',
	`accentColor` varchar(32) NOT NULL DEFAULT '#25d366',
	`textColor` varchar(32) NOT NULL DEFAULT '#ffffff',
	`backgroundColor` varchar(32) NOT NULL DEFAULT '#25d366',
	`borderColor` varchar(32) NOT NULL DEFAULT '#25d366',
	`icon` varchar(16) NOT NULL,
	`imageKey` varchar(512),
	`imageUrl` longtext,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isVisible` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contact_socials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contact_whatsapp_numbers` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`label` varchar(160) NOT NULL,
	`description` longtext,
	`number` varchar(40) NOT NULL,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`imageKey` varchar(512),
	`imageUrl` longtext,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isVisible` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contact_whatsapp_numbers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `contact_addresses_order_index` ON `contact_addresses` (`sortOrder`);--> statement-breakpoint
CREATE INDEX `contact_emails_order_index` ON `contact_emails` (`sortOrder`);--> statement-breakpoint
CREATE INDEX `contact_mobile_order_index` ON `contact_mobile_numbers` (`sortOrder`);--> statement-breakpoint
CREATE INDEX `contact_socials_order_index` ON `contact_socials` (`sortOrder`);--> statement-breakpoint
CREATE INDEX `contact_whatsapp_order_index` ON `contact_whatsapp_numbers` (`sortOrder`);
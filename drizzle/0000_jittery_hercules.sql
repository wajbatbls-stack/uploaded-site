CREATE TABLE `content_collections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionKey` varchar(80) NOT NULL,
	`label` varchar(160) NOT NULL,
	`content` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_collections_id` PRIMARY KEY(`id`),
	CONSTRAINT `content_collections_key_unique` UNIQUE(`collectionKey`)
);
--> statement-breakpoint
CREATE TABLE `site_orders` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`studentName` varchar(180) NOT NULL,
	`service` varchar(255) NOT NULL,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `site_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_visits` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`path` varchar(255) NOT NULL,
	`visitedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `site_visits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);

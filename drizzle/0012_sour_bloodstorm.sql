CREATE TABLE `blog_articles` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`title` varchar(300) NOT NULL,
	`slug` varchar(320) NOT NULL,
	`summary` longtext,
	`body` longtext,
	`author` varchar(160) NOT NULL DEFAULT 'فريق واجبات بلس',
	`publishedText` varchar(60),
	`categoryId` bigint,
	`categoryText` varchar(120),
	`imageKey` varchar(512),
	`imageUrl` longtext,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isVisible` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blog_articles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blog_categories` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isVisible` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blog_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contact_socials` ADD `label` varchar(160);--> statement-breakpoint
ALTER TABLE `contact_socials` ADD `description` longtext;--> statement-breakpoint
CREATE INDEX `blog_articles_order_index` ON `blog_articles` (`sortOrder`);--> statement-breakpoint
CREATE INDEX `blog_articles_category_index` ON `blog_articles` (`categoryId`);--> statement-breakpoint
CREATE INDEX `blog_articles_visibility_index` ON `blog_articles` (`isVisible`);--> statement-breakpoint
CREATE INDEX `blog_articles_slug_index` ON `blog_articles` (`slug`);--> statement-breakpoint
CREATE INDEX `blog_categories_order_index` ON `blog_categories` (`sortOrder`);
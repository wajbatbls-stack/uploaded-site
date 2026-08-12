CREATE TABLE `admin_audit_events` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`ownerAccountId` int,
	`action` varchar(120) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` varchar(80),
	`details` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assignment_requests` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`customerId` bigint,
	`studentName` varchar(180) NOT NULL,
	`studentId` varchar(100) NOT NULL,
	`university` varchar(200) NOT NULL,
	`college` varchar(200) NOT NULL,
	`department` varchar(200),
	`course` varchar(200) NOT NULL,
	`professor` varchar(180) NOT NULL,
	`serviceType` varchar(255) NOT NULL,
	`deadline` varchar(10) NOT NULL,
	`description` longtext NOT NULL,
	`attachmentMediaId` bigint,
	`status` enum('new','reviewing','in_progress','completed','cancelled') NOT NULL DEFAULT 'new',
	`adminNotes` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assignment_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contact_messages` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`customerId` bigint,
	`name` varchar(180) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`email` varchar(320),
	`subject` varchar(255) NOT NULL,
	`message` longtext NOT NULL,
	`status` enum('new','read','replied','archived') NOT NULL DEFAULT 'new',
	`adminNotes` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contact_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`fullName` varchar(180) NOT NULL,
	`email` varchar(320),
	`phone` varchar(32),
	`university` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_files` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`url` longtext NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`sizeBytes` bigint NOT NULL,
	`category` enum('image','document','other') NOT NULL,
	`usage` varchar(80) NOT NULL DEFAULT 'library',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `media_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `owner_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`sessionVersion` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `owner_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `owner_accounts_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `submitted_reviews` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`university` varchar(200) NOT NULL,
	`review` longtext NOT NULL,
	`rating` int NOT NULL DEFAULT 5,
	`status` enum('pending','published','hidden') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `submitted_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `admin_audit_events_created_at_index` ON `admin_audit_events` (`createdAt`);--> statement-breakpoint
CREATE INDEX `assignment_requests_status_index` ON `assignment_requests` (`status`);--> statement-breakpoint
CREATE INDEX `assignment_requests_created_at_index` ON `assignment_requests` (`createdAt`);--> statement-breakpoint
CREATE INDEX `contact_messages_status_index` ON `contact_messages` (`status`);--> statement-breakpoint
CREATE INDEX `contact_messages_created_at_index` ON `contact_messages` (`createdAt`);--> statement-breakpoint
CREATE INDEX `customers_email_index` ON `customers` (`email`);--> statement-breakpoint
CREATE INDEX `customers_phone_index` ON `customers` (`phone`);--> statement-breakpoint
CREATE INDEX `media_files_category_index` ON `media_files` (`category`);--> statement-breakpoint
CREATE INDEX `submitted_reviews_status_index` ON `submitted_reviews` (`status`);
CREATE TABLE `owner_sessions` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`ownerAccountId` int NOT NULL,
	`sessionId` varchar(96) NOT NULL,
	`userAgent` varchar(512),
	`ipAddress` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`expiresAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	CONSTRAINT `owner_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `owner_sessions_session_id_unique` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE INDEX `owner_sessions_owner_account_index` ON `owner_sessions` (`ownerAccountId`,`revokedAt`);
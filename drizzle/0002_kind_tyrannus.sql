ALTER TABLE `site_visits` ADD `source` varchar(80) DEFAULT 'direct' NOT NULL;--> statement-breakpoint
ALTER TABLE `site_visits` ADD `deviceType` varchar(24) DEFAULT 'desktop' NOT NULL;--> statement-breakpoint
CREATE INDEX `site_visits_date_index` ON `site_visits` (`visitedAt`);--> statement-breakpoint
CREATE INDEX `site_visits_source_index` ON `site_visits` (`source`);--> statement-breakpoint
CREATE INDEX `site_visits_device_index` ON `site_visits` (`deviceType`);
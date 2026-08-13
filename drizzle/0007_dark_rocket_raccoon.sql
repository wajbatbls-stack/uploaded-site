ALTER TABLE `owner_login_settings` ADD `clockEnabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `owner_login_settings` ADD `clockStyle` varchar(40) DEFAULT 'digital-clean' NOT NULL;--> statement-breakpoint
ALTER TABLE `owner_login_settings` ADD `clockPosition` varchar(32) DEFAULT 'above_card' NOT NULL;--> statement-breakpoint
ALTER TABLE `owner_login_settings` ADD `clockFormat` varchar(8) DEFAULT '24' NOT NULL;--> statement-breakpoint
ALTER TABLE `owner_login_settings` ADD `clockColor` varchar(32) DEFAULT '#15213d' NOT NULL;--> statement-breakpoint
ALTER TABLE `owner_login_settings` ADD `clockAccentColor` varchar(32) DEFAULT '#4966d6' NOT NULL;--> statement-breakpoint
ALTER TABLE `owner_login_settings` ADD `clockSize` int DEFAULT 52 NOT NULL;--> statement-breakpoint
ALTER TABLE `owner_login_settings` ADD `clockShowSeconds` boolean DEFAULT true NOT NULL;
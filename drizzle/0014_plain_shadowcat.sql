ALTER TABLE `partners` ADD `shape` varchar(40) DEFAULT 'card' NOT NULL;--> statement-breakpoint
ALTER TABLE `partners` ADD `accentColor` varchar(12) DEFAULT '#4966d6';--> statement-breakpoint
ALTER TABLE `partners` ADD `textColor` varchar(12) DEFAULT '#ffffff';--> statement-breakpoint
ALTER TABLE `partners` ADD `backgroundColor` varchar(12) DEFAULT '#eef1f8';--> statement-breakpoint
ALTER TABLE `partners` ADD `borderColor` varchar(12);
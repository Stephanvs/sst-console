ALTER TABLE `state_resource` ADD `time_created` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `state_resource` ADD `time_updated` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `state_resource` ADD `time_deleted` timestamp;
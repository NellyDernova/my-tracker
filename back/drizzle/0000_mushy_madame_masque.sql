CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text DEFAULT 'me' NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`emoji` text DEFAULT '📁' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_projects_user` ON `projects` (`user_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text DEFAULT 'me' NOT NULL,
	`project_id` text,
	`parent_id` text,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`date_type` text DEFAULT 'none' NOT NULL,
	`date` text,
	`status` text DEFAULT 'todo' NOT NULL,
	`repeat` text DEFAULT 'none' NOT NULL,
	`repeat_days` text DEFAULT '[]' NOT NULL,
	`important` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`parent_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_user` ON `tasks` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_project` ON `tasks` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_parent` ON `tasks` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_date` ON `tasks` (`date`);--> statement-breakpoint
CREATE INDEX `idx_tasks_group` ON `tasks` (`user_id`,`project_id`,`parent_id`);
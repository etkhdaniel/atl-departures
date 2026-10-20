CREATE TABLE `observations` (
	`id` text PRIMARY KEY NOT NULL,
	`route` text NOT NULL,
	`outbound` text NOT NULL,
	`inbound` text NOT NULL,
	`observed` integer NOT NULL,
	`price` real NOT NULL,
	`offers` text NOT NULL,
	`source` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `searches` (
	`id` text PRIMARY KEY NOT NULL,
	`started` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `usage` (
	`month` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);

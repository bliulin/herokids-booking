CREATE TABLE IF NOT EXISTS `bookings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`number_of_children` integer NOT NULL,
	`booking_type` text DEFAULT 'play_session' NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`payment_status` text DEFAULT 'unpaid' NOT NULL,
	`notes` text,
	`google_calendar_event_id` text,
	`calendar_sync_status` text DEFAULT 'not_synced' NOT NULL,
	`calendar_sync_error` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `bookings_status_idx` ON `bookings` (`status`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `bookings_start_time_idx` ON `bookings` (`start_time`);

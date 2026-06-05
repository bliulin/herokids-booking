CREATE TABLE IF NOT EXISTS "bookings" (
  "id"                      serial PRIMARY KEY,
  "customer_name"           text NOT NULL,
  "phone"                   text NOT NULL,
  "email"                   text,
  "number_of_children"      integer NOT NULL,
  "booking_type"            text NOT NULL DEFAULT 'standard',
  "start_time"              text NOT NULL,
  "end_time"                text NOT NULL,
  "status"                  text NOT NULL DEFAULT 'pending',
  "payment_status"          text NOT NULL DEFAULT 'unpaid',
  "notes"                   text,
  "google_calendar_event_id" text,
  "calendar_sync_status"    text NOT NULL DEFAULT 'not_synced',
  "calendar_sync_error"     text,
  "created_at"              timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"              timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_status_idx"     ON "bookings" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_start_time_idx" ON "bookings" ("start_time");

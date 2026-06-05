UPDATE bookings SET booking_type = 'standard' WHERE booking_type = 'play_session';
--> statement-breakpoint
UPDATE bookings SET booking_type = 'hero'     WHERE booking_type = 'birthday_party';
--> statement-breakpoint
UPDATE bookings SET booking_type = 'vip'      WHERE booking_type = 'private_event';
--> statement-breakpoint
UPDATE bookings SET booking_type = 'atelier'  WHERE booking_type = 'other';

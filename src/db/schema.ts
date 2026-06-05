import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, real } from "drizzle-orm/sqlite-core";

export type BookingType = "play_session" | "birthday_party" | "private_event" | "other";
export type BookingStatus = "pending" | "confirmed" | "cancelled";
export type PaymentStatus = "unpaid" | "deposit_paid" | "paid_in_full";
export type CalendarSyncStatus = "not_synced" | "synced" | "sync_failed" | "pending_sync";

export const bookings = sqliteTable("bookings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  numberOfChildren: integer("number_of_children").notNull(),
  bookingType: text("booking_type").$type<BookingType>().notNull().default("play_session"),
  startTime: text("start_time").notNull(), // ISO 8601 string
  endTime: text("end_time").notNull(),     // ISO 8601 string
  status: text("status").$type<BookingStatus>().notNull().default("pending"),
  paymentStatus: text("payment_status").$type<PaymentStatus>().notNull().default("unpaid"),
  notes: text("notes"),
  googleCalendarEventId: text("google_calendar_event_id"),
  calendarSyncStatus: text("calendar_sync_status").$type<CalendarSyncStatus>().notNull().default("not_synced"),
  calendarSyncError: text("calendar_sync_error"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

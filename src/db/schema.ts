import { sql } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export type BookingType = "standard" | "hero" | "vip" | "walk_in" | "atelier";
export type BookingStatus = "pending" | "confirmed" | "cancelled";
export type PaymentStatus = "unpaid" | "deposit_paid" | "paid_in_full";
export type CalendarSyncStatus = "not_synced" | "synced" | "sync_failed" | "pending_sync";

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  numberOfChildren: integer("number_of_children").notNull(),
  bookingType: text("booking_type").$type<BookingType>().notNull().default("standard"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  status: text("status").$type<BookingStatus>().notNull().default("pending"),
  paymentStatus: text("payment_status").$type<PaymentStatus>().notNull().default("unpaid"),
  notes: text("notes"),
  googleCalendarEventId: text("google_calendar_event_id"),
  calendarSyncStatus: text("calendar_sync_status").$type<CalendarSyncStatus>().notNull().default("not_synced"),
  calendarSyncError: text("calendar_sync_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

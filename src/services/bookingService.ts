import { eq, gte, lte, and, desc } from "drizzle-orm";
import { db, sqlite } from "@/db";
import { bookings, type Booking, type NewBooking } from "@/db/schema";
import { checkCapacity } from "./capacityService";
import {
  createCalendarEvent,
  updateCalendarEvent,
  cancelCalendarEvent,
} from "./googleCalendarService";
import type { CreateBookingInput, UpdateBookingInput } from "@/types/booking";

export class BookingError extends Error {
  constructor(
    message: string,
    public code: "capacity_exceeded" | "validation_error" | "not_found" | "db_error",
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "BookingError";
  }
}

export async function getBookings(from?: string, to?: string): Promise<Booking[]> {
  if (from && to) {
    return db
      .select()
      .from(bookings)
      .where(
        and(
          gte(bookings.startTime, from),
          lte(bookings.startTime, to)
        )
      )
      .orderBy(bookings.startTime);
  }
  return db.select().from(bookings).orderBy(desc(bookings.startTime));
}

export async function getBookingById(id: number): Promise<Booking> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
  if (!booking) {
    throw new BookingError(`Booking ${id} not found`, "not_found");
  }
  return booking;
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  if (new Date(input.endTime) <= new Date(input.startTime)) {
    throw new BookingError("End time must be after start time", "validation_error");
  }

  // Server-side capacity check inside an exclusive transaction to prevent race conditions.
  // SQLite serializes writes, so wrapping in a transaction guarantees the check and insert are atomic.
  const insert = sqlite.transaction(() => {
    // Re-run capacity check inside the transaction
    const capacity = checkCapacitySync(input.startTime, input.endTime, input.numberOfChildren);
    if (!capacity.allowed) {
      throw new BookingError(
        capacity.message ?? "Capacity exceeded",
        "capacity_exceeded",
        { currentOccupancy: capacity.currentOccupancy, max: capacity.max }
      );
    }

    const now = new Date().toISOString();
    const [created] = db
      .insert(bookings)
      .values({
        customerName: input.customerName,
        phone: input.phone,
        email: input.email || null,
        numberOfChildren: input.numberOfChildren,
        bookingType: input.bookingType,
        startTime: input.startTime,
        endTime: input.endTime,
        status: input.status,
        paymentStatus: input.paymentStatus,
        notes: input.notes || null,
        calendarSyncStatus: "not_synced",
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .all();

    return created;
  });

  const created = insert();

  // Sync to Google Calendar after the transaction commits (non-blocking on failure)
  const syncResult = await createCalendarEvent(created);
  if (syncResult.success && syncResult.eventId) {
    await db
      .update(bookings)
      .set({
        googleCalendarEventId: syncResult.eventId,
        calendarSyncStatus: "synced",
        calendarSyncError: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(bookings.id, created.id));
    return { ...created, googleCalendarEventId: syncResult.eventId, calendarSyncStatus: "synced" };
  } else if (!syncResult.success) {
    await db
      .update(bookings)
      .set({
        calendarSyncStatus: "sync_failed",
        calendarSyncError: syncResult.error ?? null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(bookings.id, created.id));
    return { ...created, calendarSyncStatus: "sync_failed", calendarSyncError: syncResult.error ?? null };
  }

  return created;
}

export async function updateBooking(id: number, input: Partial<CreateBookingInput>): Promise<Booking> {
  const existing = await getBookingById(id);

  const startTime = input.startTime ?? existing.startTime;
  const endTime = input.endTime ?? existing.endTime;
  const numberOfChildren = input.numberOfChildren ?? existing.numberOfChildren;

  if (new Date(endTime) <= new Date(startTime)) {
    throw new BookingError("End time must be after start time", "validation_error");
  }

  // Only capacity-check if the booking is not being cancelled
  const newStatus = input.status ?? existing.status;
  if (newStatus !== "cancelled") {
    const capacity = await checkCapacity(startTime, endTime, numberOfChildren, id);
    if (!capacity.allowed) {
      throw new BookingError(
        capacity.message ?? "Capacity exceeded",
        "capacity_exceeded",
        { currentOccupancy: capacity.currentOccupancy, max: capacity.max }
      );
    }
  }

  const update = sqlite.transaction(() => {
    const [updated] = db
      .update(bookings)
      .set({
        ...(input.customerName !== undefined && { customerName: input.customerName }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.email !== undefined && { email: input.email || null }),
        ...(input.numberOfChildren !== undefined && { numberOfChildren: input.numberOfChildren }),
        ...(input.bookingType !== undefined && { bookingType: input.bookingType }),
        ...(input.startTime !== undefined && { startTime: input.startTime }),
        ...(input.endTime !== undefined && { endTime: input.endTime }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.paymentStatus !== undefined && { paymentStatus: input.paymentStatus }),
        ...(input.notes !== undefined && { notes: input.notes || null }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(bookings.id, id))
      .returning()
      .all();
    return updated;
  });

  const updated = update();

  // Sync calendar
  let syncResult;
  if (updated.status === "cancelled" && updated.googleCalendarEventId) {
    syncResult = await cancelCalendarEvent(updated.googleCalendarEventId);
  } else {
    syncResult = await updateCalendarEvent(updated);
  }

  const calendarUpdates = syncResult.success
    ? {
        googleCalendarEventId: syncResult.eventId ?? updated.googleCalendarEventId,
        calendarSyncStatus: "synced" as const,
        calendarSyncError: null,
      }
    : {
        calendarSyncStatus: "sync_failed" as const,
        calendarSyncError: syncResult.error ?? null,
      };

  await db
    .update(bookings)
    .set({ ...calendarUpdates, updatedAt: new Date().toISOString() })
    .where(eq(bookings.id, id));

  return { ...updated, ...calendarUpdates };
}

export async function cancelBooking(id: number): Promise<Booking> {
  return updateBooking(id, { status: "cancelled" });
}

// Synchronous version for use inside SQLite transactions
function checkCapacitySync(
  startTime: string,
  endTime: string,
  numberOfChildren: number,
  excludeId?: number
): { allowed: boolean; currentOccupancy: number; max: number; message?: string } {
  const max = 30;

  // Use raw sqlite for synchronous execution inside a transaction
  let query = `
    SELECT COALESCE(SUM(number_of_children), 0) as total
    FROM bookings
    WHERE status != 'cancelled'
      AND start_time < ?
      AND end_time > ?
  `;
  const params: (string | number)[] = [endTime, startTime];

  if (excludeId !== undefined) {
    query += " AND id != ?";
    params.push(excludeId);
  }

  const row = sqlite.prepare(query).get(...params) as { total: number };
  const currentOccupancy = row?.total ?? 0;
  const total = currentOccupancy + numberOfChildren;

  if (total > max) {
    return {
      allowed: false,
      currentOccupancy,
      max,
      message: `Capacity exceeded. ${currentOccupancy} children already booked in this time slot. Adding ${numberOfChildren} more would reach ${total}/${max}.`,
    };
  }

  return { allowed: true, currentOccupancy, max };
}

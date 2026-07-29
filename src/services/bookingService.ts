import { eq, gte, lte, and, ne, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, type Booking } from "@/db/schema";
import { config } from "@/lib/config";
import {
  createCalendarEvent,
  updateCalendarEvent,
  cancelCalendarEvent,
} from "./googleCalendarService";
import { sendBookingNotificationEmail } from "./emailService";
import type { CreateBookingInput } from "@/types/booking";

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
      .where(and(gte(bookings.startTime, from), lte(bookings.startTime, to)))
      .orderBy(bookings.startTime);
  }
  return db.select().from(bookings).orderBy(desc(bookings.startTime));
}

export async function getBookingById(id: number): Promise<Booking> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
  if (!booking) throw new BookingError(`Booking ${id} not found`, "not_found");
  return booking;
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  if (new Date(input.endTime) <= new Date(input.startTime)) {
    throw new BookingError("End time must be after start time", "validation_error");
  }

  // SERIALIZABLE transaction: PostgreSQL will abort one of two concurrent transactions
  // that would both pass the capacity check, preventing phantom-read race conditions.
  let created: Booking;
  try {
    created = await db.transaction(
      async (tx) => {
        const capacity = await checkCapacityInTx(
          tx, input.startTime, input.endTime, input.numberOfChildren
        );
        if (!capacity.allowed) {
          throw new BookingError(capacity.message!, "capacity_exceeded", {
            currentOccupancy: capacity.currentOccupancy,
            max: capacity.max,
          });
        }

        const [row] = await tx
          .insert(bookings)
          .values({
            customerName: input.customerName,
            phone: input.phone || "",
            email: input.email || null,
            numberOfChildren: input.numberOfChildren,
            bookingType: input.bookingType,
            startTime: input.startTime,
            endTime: input.endTime,
            status: input.status,
            paymentStatus: input.paymentStatus,
            notes: input.notes || null,
            calendarSyncStatus: "not_synced",
          })
          .returning();
        return row;
      },
      { isolationLevel: "serializable" }
    );
  } catch (err) {
    if (err instanceof BookingError) throw err;
    // PostgreSQL serialization failure (code 40001) — treat as capacity error
    if ((err as any)?.code === "40001") {
      throw new BookingError(
        "Booking could not be saved due to a concurrent update. Please try again.",
        "capacity_exceeded"
      );
    }
    throw err;
  }

  const result = await applyCalendarSync(created, () => createCalendarEvent(created));
  sendBookingNotificationEmail(result, "created").catch(console.error);
  return result;
}

export async function updateBooking(id: number, input: Partial<CreateBookingInput>): Promise<Booking> {
  const existing = await getBookingById(id);

  const startTime = input.startTime ?? existing.startTime;
  const endTime = input.endTime ?? existing.endTime;
  const numberOfChildren = input.numberOfChildren ?? existing.numberOfChildren;
  const newStatus = input.status ?? existing.status;

  if (new Date(endTime) <= new Date(startTime)) {
    throw new BookingError("End time must be after start time", "validation_error");
  }

  let updated: Booking;
  try {
    updated = await db.transaction(
      async (tx) => {
        if (newStatus !== "cancelled") {
          const capacity = await checkCapacityInTx(
            tx, startTime, endTime, numberOfChildren, id
          );
          if (!capacity.allowed) {
            throw new BookingError(capacity.message!, "capacity_exceeded", {
              currentOccupancy: capacity.currentOccupancy,
              max: capacity.max,
            });
          }
        }

        const [row] = await tx
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
            updatedAt: new Date(),
          })
          .where(eq(bookings.id, id))
          .returning();
        return row;
      },
      { isolationLevel: "serializable" }
    );
  } catch (err) {
    if (err instanceof BookingError) throw err;
    if ((err as any)?.code === "40001") {
      throw new BookingError(
        "Booking could not be saved due to a concurrent update. Please try again.",
        "capacity_exceeded"
      );
    }
    throw err;
  }

  const calendarOp =
    updated.status === "cancelled" && updated.googleCalendarEventId
      ? () => cancelCalendarEvent(updated.googleCalendarEventId!)
      : () => updateCalendarEvent(updated);

  const result = await applyCalendarSync(updated, calendarOp);
  const action = result.status === "cancelled" ? "cancelled" : "updated";
  sendBookingNotificationEmail(result, action).catch(console.error);
  return result;
}

export async function cancelBooking(id: number): Promise<Booking> {
  return updateBooking(id, { status: "cancelled" });
}

// ─── helpers ────────────────────────────────────────────────────────────────

async function checkCapacityInTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  startTime: string,
  endTime: string,
  numberOfChildren: number,
  excludeId?: number
) {
  const max = config.venue.maxChildren;
  const conditions = [
    ne(bookings.status, "cancelled"),
    sql`${bookings.startTime} < ${endTime}`,
    sql`${bookings.endTime} > ${startTime}`,
  ];
  if (excludeId !== undefined) conditions.push(ne(bookings.id, excludeId));

  const rows = await tx
    .select({ n: bookings.numberOfChildren })
    .from(bookings)
    .where(and(...conditions));

  const currentOccupancy = rows.reduce((s, r) => s + r.n, 0);
  const total = currentOccupancy + numberOfChildren;

  return {
    allowed: total <= max,
    currentOccupancy,
    max,
    message:
      total > max
        ? `Capacity exceeded. ${currentOccupancy} children already booked in this time slot. Adding ${numberOfChildren} more would reach ${total}/${max}.`
        : undefined,
  };
}

async function applyCalendarSync(
  booking: Booking,
  calendarOp: () => Promise<{ success: boolean; eventId?: string; error?: string }>
): Promise<Booking> {
  const syncResult = await calendarOp();

  const calendarUpdates = syncResult.success
    ? {
        googleCalendarEventId: syncResult.eventId ?? booking.googleCalendarEventId,
        calendarSyncStatus: "synced" as const,
        calendarSyncError: null,
      }
    : {
        calendarSyncStatus: "sync_failed" as const,
        calendarSyncError: syncResult.error ?? null,
      };

  await db
    .update(bookings)
    .set({ ...calendarUpdates, updatedAt: new Date() })
    .where(eq(bookings.id, booking.id));

  return { ...booking, ...calendarUpdates };
}

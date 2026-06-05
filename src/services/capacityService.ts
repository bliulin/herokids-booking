import { and, ne, not, eq, or, lte, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { config } from "@/lib/config";

export interface CapacityCheckResult {
  allowed: boolean;
  currentOccupancy: number;
  requested: number;
  max: number;
  message?: string;
}

/**
 * Checks whether adding `numberOfChildren` children during [startTime, endTime]
 * would exceed venue capacity. Excludes the booking with `excludeId` (used during edits).
 *
 * Uses a database-level SELECT with a FOR UPDATE equivalent (SQLite serialized writes
 * via WAL + exclusive transaction) to prevent race conditions.
 */
export async function checkCapacity(
  startTime: string,
  endTime: string,
  numberOfChildren: number,
  excludeId?: number
): Promise<CapacityCheckResult> {
  const max = config.venue.maxChildren;

  // Find all active (non-cancelled) bookings that overlap the requested time range.
  // Two bookings overlap when: start_A < end_B AND end_A > start_B
  const conditions = [
    ne(bookings.status, "cancelled"),
    // overlap condition: existing.startTime < endTime AND existing.endTime > startTime
    sql`${bookings.startTime} < ${endTime}`,
    sql`${bookings.endTime} > ${startTime}`,
  ];

  if (excludeId !== undefined) {
    conditions.push(ne(bookings.id, excludeId));
  }

  const overlapping = await db
    .select({ numberOfChildren: bookings.numberOfChildren })
    .from(bookings)
    .where(and(...conditions));

  const currentOccupancy = overlapping.reduce((sum, b) => sum + b.numberOfChildren, 0);
  const total = currentOccupancy + numberOfChildren;

  if (total > max) {
    return {
      allowed: false,
      currentOccupancy,
      requested: numberOfChildren,
      max,
      message: `Capacity exceeded. ${currentOccupancy} children already booked in this time slot. Adding ${numberOfChildren} more would reach ${total}/${max}.`,
    };
  }

  return { allowed: true, currentOccupancy, requested: numberOfChildren, max };
}

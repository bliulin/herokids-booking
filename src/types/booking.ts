import { z } from "zod";
import type { Booking } from "@/db/schema";

export type { Booking };

export const bookingTypeLabels = {
  play_session: "Play Session",
  birthday_party: "Birthday Party",
  private_event: "Private Event",
  other: "Other",
} as const;

export const bookingStatusLabels = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
} as const;

export const paymentStatusLabels = {
  unpaid: "Unpaid",
  deposit_paid: "Deposit Paid",
  paid_in_full: "Paid in Full",
} as const;

export const bookingStatusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
} as const;

export const bookingTypeColors = {
  play_session: "#3b82f6",
  birthday_party: "#ec4899",
  private_event: "#8b5cf6",
  other: "#f97316",
} as const;

export const createBookingSchema = z.object({
  customerName: z.string().min(1, "Customer name is required").max(200),
  phone: z.string().min(1, "Phone number is required").max(50),
  email: z.string().email("Invalid email address").max(200).optional().or(z.literal("")),
  numberOfChildren: z
    .number({ invalid_type_error: "Must be a number" })
    .int("Must be a whole number")
    .min(1, "At least 1 child required")
    .max(30, "Cannot exceed venue maximum of 30"),
  bookingType: z.enum(["play_session", "birthday_party", "private_event", "other"]),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  status: z.enum(["pending", "confirmed", "cancelled"]),
  paymentStatus: z.enum(["unpaid", "deposit_paid", "paid_in_full"]),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export const updateBookingSchema = createBookingSchema.partial().extend({
  id: z.number().int().positive(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  details?: string;
}

export interface CapacityError {
  type: "capacity_exceeded";
  message: string;
  current: number;
  requested: number;
  max: number;
}

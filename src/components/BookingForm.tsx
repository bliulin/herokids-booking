"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBookingSchema, type CreateBookingInput } from "@/types/booking";
import type { Booking } from "@/db/schema";
import { format } from "date-fns";

interface BookingFormProps {
  defaultValues?: Partial<CreateBookingInput>;
  onSubmit: (data: CreateBookingInput) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  serverError?: string;
}

function toDateTimeLocal(iso?: string | null): string {
  if (!iso) return "";
  try {
    return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
  } catch {
    return "";
  }
}

export function BookingForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel = "Save Booking",
  serverError,
}: BookingFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateBookingInput>({
    resolver: zodResolver(createBookingSchema),
    defaultValues: {
      status: "pending",
      paymentStatus: "unpaid",
      bookingType: "play_session",
      numberOfChildren: 1,
      ...defaultValues,
      // datetime-local inputs require "yyyy-MM-dd'T'HH:mm" — convert from ISO if present
      startTime: toDateTimeLocal(defaultValues?.startTime) || defaultValues?.startTime || "",
      endTime: toDateTimeLocal(defaultValues?.endTime) || defaultValues?.endTime || "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Customer Info */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Customer Name *" error={errors.customerName?.message}>
          <input {...register("customerName")} className={input(errors.customerName)} placeholder="Full name" />
        </Field>
        <Field label="Phone *" error={errors.phone?.message}>
          <input {...register("phone")} className={input(errors.phone)} placeholder="+44 7700 000000" />
        </Field>
      </div>

      <Field label="Email" error={errors.email?.message}>
        <input {...register("email")} type="email" className={input(errors.email)} placeholder="optional@email.com" />
      </Field>

      {/* Booking Details */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Booking Type *" error={errors.bookingType?.message}>
          <select {...register("bookingType")} className={input(errors.bookingType)}>
            <option value="play_session">Play Session</option>
            <option value="birthday_party">Birthday Party</option>
            <option value="private_event">Private Event</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Number of Children *" error={errors.numberOfChildren?.message}>
          <input
            {...register("numberOfChildren", { valueAsNumber: true })}
            type="number"
            min={1}
            max={30}
            className={input(errors.numberOfChildren)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Start Time *" error={errors.startTime?.message}>
          <input
            {...register("startTime")}
            type="datetime-local"
            className={input(errors.startTime)}
          />
        </Field>
        <Field label="End Time *" error={errors.endTime?.message}>
          <input
            {...register("endTime")}
            type="datetime-local"
            className={input(errors.endTime)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Status *" error={errors.status?.message}>
          <select {...register("status")} className={input(errors.status)}>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </Field>
        <Field label="Payment Status *" error={errors.paymentStatus?.message}>
          <select {...register("paymentStatus")} className={input(errors.paymentStatus)}>
            <option value="unpaid">Unpaid</option>
            <option value="deposit_paid">Deposit Paid</option>
            <option value="paid_in_full">Paid in Full</option>
          </select>
        </Field>
      </div>

      <Field label="Internal Notes" error={errors.notes?.message}>
        <textarea
          {...register("notes")}
          className={`${input(errors.notes)} resize-none`}
          rows={3}
          placeholder="Optional notes visible only to staff"
        />
      </Field>

      {serverError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-sky-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-sky-700 disabled:opacity-50 transition-colors"
      >
        {isSubmitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function input(error?: { message?: string }) {
  return `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${
    error ? "border-red-400 bg-red-50" : "border-gray-300"
  }`;
}

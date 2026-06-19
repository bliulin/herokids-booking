"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  bookingTypeLabels,
  bookingStatusLabels,
  paymentStatusLabels,
  bookingStatusColors,
  type CreateBookingInput,
} from "@/types/booking";
import type { Booking } from "@/db/schema";
import { BookingForm } from "./BookingForm";
import { useUpdateBooking, useCancelBooking } from "@/hooks/useBookings";
import { AlertCircle, CheckCircle, RefreshCw, Edit2, Trash2 } from "lucide-react";

interface BookingDetailProps {
  booking: Booking;
  onClose: () => void;
}

export function BookingDetail({ booking, onClose }: BookingDetailProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [serverError, setServerError] = useState("");

  const update = useUpdateBooking();
  const cancel = useCancelBooking();

  async function handleUpdate(data: CreateBookingInput) {
    setServerError("");
    try {
      await update.mutateAsync({ id: booking.id, input: data });
      setMode("view");
      onClose();
    } catch (err: any) {
      setServerError(err.message ?? "Failed to update booking.");
    }
  }

  async function handleCancel() {
    setServerError("");
    try {
      await cancel.mutateAsync(booking.id);
      onClose();
    } catch (err: any) {
      setServerError(err.message ?? "Failed to cancel booking.");
    }
  }

  if (mode === "edit") {
    return (
      <div>
        <BookingForm
          defaultValues={{
            customerName: booking.customerName,
            phone: booking.phone,
            email: booking.email ?? "",
            numberOfChildren: booking.numberOfChildren,
            bookingType: booking.bookingType,
            startTime: booking.startTime,
            endTime: booking.endTime,
            status: booking.status,
            paymentStatus: booking.paymentStatus,
            notes: booking.notes ?? "",
          }}
          onSubmit={handleUpdate}
          isSubmitting={update.isPending}
          submitLabel="Update Booking"
          serverError={serverError}
        />
        <button
          onClick={() => setMode("view")}
          className="mt-3 w-full text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel edit
        </button>
      </div>
    );
  }

  const statusColor = bookingStatusColors[booking.status];

  return (
    <div className="space-y-5">
      {/* Header badges */}
      <div className="flex flex-wrap gap-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
          {bookingStatusLabels[booking.status]}
        </span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
          {bookingTypeLabels[booking.bookingType]}
        </span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
          {paymentStatusLabels[booking.paymentStatus]}
        </span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Detail label="Customer" value={booking.customerName} />
        <Detail label="Phone" value={booking.phone} />
        {booking.email && <Detail label="Email" value={booking.email} />}
        <Detail label="Children" value={`${booking.numberOfChildren}`} />
        <Detail
          label="Start"
          value={format(new Date(booking.startTime), "dd-MM-yyyy, HH:mm")}
        />
        <Detail
          label="End"
          value={format(new Date(booking.endTime), "dd-MM-yyyy, HH:mm")}
        />
      </div>

      {booking.notes && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
          <p className="font-medium text-gray-500 text-xs mb-1">Notes</p>
          {booking.notes}
        </div>
      )}

      {/* Calendar sync status */}
      <CalendarSyncBadge booking={booking} />

      {/* Meta */}
      <p className="text-xs text-gray-400">
        Created {format(new Date(booking.createdAt), "dd-MM-yyyy HH:mm")} ·
        Updated {format(new Date(booking.updatedAt), "dd-MM-yyyy HH:mm")}
      </p>

      {serverError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Actions */}
      {booking.status !== "cancelled" && (
        <div className="flex gap-2 pt-2 border-t">
          <button
            onClick={() => setMode("edit")}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors"
          >
            <Edit2 size={14} /> Edit
          </button>

          {!cancelConfirm ? (
            <button
              onClick={() => setCancelConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
            >
              <Trash2 size={14} /> Cancel Booking
            </button>
          ) : (
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-600">Confirm cancel?</span>
              <button
                onClick={handleCancel}
                disabled={cancel.isPending}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {cancel.isPending ? "Cancelling..." : "Yes, cancel"}
              </button>
              <button
                onClick={() => setCancelConfirm(false)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm"
              >
                No
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-gray-800 font-medium">{value}</p>
    </div>
  );
}

function CalendarSyncBadge({ booking }: { booking: Booking }) {
  const { calendarSyncStatus, calendarSyncError, googleCalendarEventId } = booking;

  if (calendarSyncStatus === "synced") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
        <CheckCircle size={13} />
        Synced to Google Calendar
        {googleCalendarEventId && (
          <span className="text-green-500 font-mono ml-1">#{googleCalendarEventId.slice(0, 8)}</span>
        )}
      </div>
    );
  }

  if (calendarSyncStatus === "sync_failed") {
    return (
      <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
        <AlertCircle size={13} className="mt-0.5 shrink-0" />
        <span>
          <strong>Google Calendar sync failed.</strong>
          {calendarSyncError && <> {calendarSyncError}</>}
        </span>
      </div>
    );
  }

  if (calendarSyncStatus === "not_synced") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
        <RefreshCw size={13} />
        Not synced to Google Calendar
      </div>
    );
  }

  return null;
}

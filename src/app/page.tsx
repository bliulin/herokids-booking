"use client";

import { useState, useCallback } from "react";
import { format, addMonths, subMonths } from "date-fns";
import { Plus } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { BookingCalendar } from "@/components/BookingCalendar";
import { BookingDetail } from "@/components/BookingDetail";
import { BookingForm } from "@/components/BookingForm";
import { Modal } from "@/components/BookingModal";
import { useBookings, useCreateBooking } from "@/hooks/useBookings";
import type { Booking } from "@/db/schema";
import type { CreateBookingInput } from "@/types/booking";
import { bookingTypeColors, bookingTypeLabels } from "@/types/booking";

export default function HomePage() {
  const [rangeFrom, setRangeFrom] = useState<string>("");
  const [rangeTo, setRangeTo] = useState<string>("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [createDefaults, setCreateDefaults] = useState<Partial<CreateBookingInput> | null>(null);
  const [createError, setCreateError] = useState("");

  const { data: bookings = [], isLoading, error } = useBookings(rangeFrom || undefined, rangeTo || undefined);
  const createMutation = useCreateBooking();

  const handleRangeChange = useCallback((start: string, end: string) => {
    setRangeFrom(start);
    setRangeTo(end);
  }, []);

  const handleDateSelect = useCallback((start: Date, end: Date) => {
    setCreateDefaults({
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    });
  }, []);

  const handleCreate = useCallback(async (data: CreateBookingInput) => {
    setCreateError("");
    try {
      await createMutation.mutateAsync(data);
      setCreateDefaults(null);
    } catch (err: any) {
      setCreateError(err.message ?? "Failed to create booking.");
    }
  }, [createMutation]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar />

      <main className="flex-1 p-4 md:p-6 max-w-screen-xl mx-auto w-full">
        {/* Page header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Bookings</h1>
            <p className="text-sm text-gray-500">Click a slot to create · Click an event to view</p>
          </div>
          <button
            onClick={() => {
              const now = new Date();
              setCreateDefaults({
                startTime: now.toISOString(),
                endTime: new Date(now.getTime() + 2.5 * 60 * 60 * 1000).toISOString(),
              });
            }}
            className="flex items-center gap-1.5 bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors shadow-sm"
          >
            <Plus size={16} /> New Booking
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4">
          {(Object.entries(bookingTypeLabels) as [keyof typeof bookingTypeColors, string][]).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span
                className="w-3 h-3 rounded-sm inline-block"
                style={{ backgroundColor: bookingTypeColors[type] }}
              />
              {label}
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-sm inline-block bg-gray-400" />
            Cancelled
          </div>
        </div>

        {/* Calendar */}
        {isLoading && (
          <div className="text-center py-12 text-gray-400">Loading bookings...</div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-4">
            Failed to load bookings. Please refresh.
          </div>
        )}
        {!isLoading && (
          <BookingCalendar
            bookings={bookings}
            onEventClick={setSelectedBooking}
            onDateSelect={handleDateSelect}
            onRangeChange={handleRangeChange}
          />
        )}
      </main>

      {/* Booking detail modal */}
      <Modal
        isOpen={selectedBooking !== null}
        onClose={() => setSelectedBooking(null)}
        title={selectedBooking ? `Booking #${selectedBooking.id}` : ""}
        size="lg"
      >
        {selectedBooking && (
          <BookingDetail
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
          />
        )}
      </Modal>

      {/* Create booking modal */}
      <Modal
        isOpen={createDefaults !== null}
        onClose={() => { setCreateDefaults(null); setCreateError(""); }}
        title="New Booking"
        size="lg"
      >
        {createDefaults !== null && (
          <BookingForm
            defaultValues={createDefaults}
            onSubmit={handleCreate}
            isSubmitting={createMutation.isPending}
            submitLabel="Create Booking"
            serverError={createError}
          />
        )}
      </Modal>
    </div>
  );
}

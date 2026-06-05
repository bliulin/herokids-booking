"use client";

import { useRef, useCallback, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  EventClickArg,
  DateSelectArg,
  EventContentArg,
  EventDropArg,
} from "@fullcalendar/core";
import type { Booking } from "@/db/schema";
import { bookingTypeColors } from "@/types/booking";
import { useUpdateBooking } from "@/hooks/useBookings";
import { X } from "lucide-react";

interface BookingCalendarProps {
  bookings: Booking[];
  onEventClick: (booking: Booking) => void;
  onDateSelect: (start: Date, end: Date) => void;
  onRangeChange: (start: string, end: string) => void;
}

function toCalendarEvent(booking: Booking) {
  const color = bookingTypeColors[booking.bookingType];
  const isCancelled = booking.status === "cancelled";

  return {
    id: String(booking.id),
    title: `${booking.numberOfChildren} · ${booking.customerName}`,
    start: booking.startTime,
    end: booking.endTime,
    backgroundColor: isCancelled ? "#9ca3af" : color,
    borderColor: "transparent",
    textColor: "#fff",
    classNames: isCancelled ? ["cancelled-event"] : [],
    // Cancelled bookings can't be moved
    editable: !isCancelled,
    extendedProps: { booking },
  };
}

function EventContent({ info }: { info: EventContentArg }) {
  const booking: Booking | undefined = info.event.extendedProps.booking;

  // FullCalendar renders internal events (selectMirror, drag ghost, etc.)
  // that don't carry our extendedProps — fall back to the default title.
  if (!booking) {
    return <div className="px-1 truncate text-xs">{info.event.title}</div>;
  }

  const isTimeGrid = info.view.type.startsWith("timeGrid");

  if (isTimeGrid) {
    return (
      <div className="px-1 py-0.5 overflow-hidden">
        <div className="font-medium truncate text-xs">{booking.customerName}</div>
        <div className="text-xs opacity-90 truncate">
          {booking.numberOfChildren} kids · {booking.bookingType.replace("_", " ")}
        </div>
      </div>
    );
  }

  return (
    <div className="px-1 truncate text-xs">
      {info.timeText && <span className="opacity-75 mr-1">{info.timeText}</span>}
      {booking.numberOfChildren}· {booking.customerName}
    </div>
  );
}

export function BookingCalendar({
  bookings,
  onEventClick,
  onDateSelect,
  onRangeChange,
}: BookingCalendarProps) {
  const calRef = useRef<FullCalendar>(null);
  const update = useUpdateBooking();
  const [dropError, setDropError] = useState<string>("");

  const events = bookings.map(toCalendarEvent);

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      const booking: Booking | undefined = info.event.extendedProps.booking;
      if (booking) onEventClick(booking);
    },
    [onEventClick]
  );

  const handleDateSelect = useCallback(
    (info: DateSelectArg) => {
      onDateSelect(info.start, info.end);
      calRef.current?.getApi().unselect();
    },
    [onDateSelect]
  );

  const handleEventDrop = useCallback(
    async (info: EventDropArg) => {
      const booking: Booking | undefined = info.event.extendedProps.booking;
      const newStart = info.event.start;
      const newEnd = info.event.end;

      if (!booking || !newStart || !newEnd) {
        info.revert();
        return;
      }

      setDropError("");
      try {
        await update.mutateAsync({
          id: booking.id,
          input: {
            startTime: newStart.toISOString(),
            endTime: newEnd.toISOString(),
          },
        });
      } catch (err: any) {
        info.revert();
        setDropError(err.message ?? "Could not move booking.");
      }
    },
    [update]
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      {dropError && (
        <div className="flex items-center justify-between mb-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
          <span>{dropError}</span>
          <button onClick={() => setDropError("")} className="ml-3 text-red-400 hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      )}

      <FullCalendar
        ref={calRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={events}
        // Enable dragging; duration resizing is off — use the edit modal for that
        editable
        eventDurationEditable={false}
        selectable
        selectMirror
        dayMaxEvents={3}
        weekends
        height="auto"
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
        slotDuration="00:30:00"
        nowIndicator
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        select={handleDateSelect}
        datesSet={(info) => onRangeChange(info.startStr, info.endStr)}
        eventContent={(info) => <EventContent info={info} />}
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        businessHours={{ daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: "08:00", endTime: "20:00" }}
      />
    </div>
  );
}

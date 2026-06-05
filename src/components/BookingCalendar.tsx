"use client";

import { useRef, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, DateSelectArg, EventContentArg } from "@fullcalendar/core";
import type { Booking } from "@/db/schema";
import { bookingTypeColors } from "@/types/booking";
import { format } from "date-fns";

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
    extendedProps: { booking },
  };
}

function EventContent({ info }: { info: EventContentArg }) {
  const booking: Booking | undefined = info.event.extendedProps.booking;

  // FullCalendar renders internal events (selectMirror, popover, etc.) that
  // don't carry our extendedProps — fall back to the default title rendering.
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
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
        select={handleDateSelect}
        datesSet={(info) => onRangeChange(info.startStr, info.endStr)}
        eventContent={(info) => <EventContent info={info} />}
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        businessHours={{ daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: "08:00", endTime: "20:00" }}
      />
    </div>
  );
}

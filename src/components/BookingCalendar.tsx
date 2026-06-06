"use client";

import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import type {
  EventClickArg,
  DateSelectArg,
  EventContentArg,
  EventDropArg,
  DatesSetArg,
} from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Booking } from "@/db/schema";
import { bookingTypeColors, bookingTypeLabels, bookingStatusColors, bookingStatusLabels } from "@/types/booking";
import { useUpdateBooking } from "@/hooks/useBookings";

interface BookingCalendarProps {
  bookings: Booking[];
  onEventClick: (booking: Booking) => void;
  onDateSelect: (start: Date, end: Date) => void;
  onRangeChange: (start: string, end: string) => void;
}

const VIEW_OPTIONS = [
  { key: "timeGridDay",  label: "Day"   },
  { key: "timeGridWeek", label: "Week"  },
  { key: "dayGridMonth", label: "Month" },
  { key: "listMonth",    label: "List"  },
] as const;

type ViewKey = typeof VIEW_OPTIONS[number]["key"];

function getInitialView(): ViewKey {
  if (typeof window !== "undefined" && window.innerWidth < 640) return "listMonth";
  return "timeGridWeek";
}

function EventContent({ info }: { info: EventContentArg }) {
  const booking: Booking | undefined = info.event.extendedProps.booking;

  if (!booking) {
    return <div className="px-1 truncate text-xs">{info.event.title}</div>;
  }

  const viewType = info.view.type;

  if (viewType.startsWith("list")) {
    const statusCls = bookingStatusColors[booking.status];
    return (
      <div className="flex items-center gap-3 min-w-0 py-0.5">
        <span className="font-medium text-sm text-gray-800 truncate">{booking.customerName}</span>
        <span className="text-xs text-gray-500 shrink-0">{booking.numberOfChildren} kids</span>
        <span className="text-xs text-gray-500 shrink-0 hidden sm:inline">
          {bookingTypeLabels[booking.bookingType]}
        </span>
        <span className={`text-xs px-1.5 py-0.5 rounded-full border shrink-0 hidden sm:inline ${statusCls}`}>
          {bookingStatusLabels[booking.status]}
        </span>
      </div>
    );
  }

  if (viewType.startsWith("timeGrid")) {
    return (
      <div className="px-1 py-0.5 overflow-hidden">
        <div className="font-medium truncate text-xs">{booking.customerName}</div>
        <div className="text-xs opacity-90 truncate">
          {booking.numberOfChildren} kids · {bookingTypeLabels[booking.bookingType]}
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
  const [title, setTitle] = useState<string>("");
  const [currentView, setCurrentView] = useState<ViewKey>(getInitialView);

  const isListView = currentView === "listMonth";

  // Capture the initial view once — never pass a changing value to FullCalendar's
  // initialView prop, as that causes it to flicker/reset on every state update.
  const initialView = useRef(currentView).current;

  useEffect(() => {
    if (window.innerWidth < 640 && currentView !== "listMonth") {
      calRef.current?.getApi().changeView("listMonth");
      setCurrentView("listMonth");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const events = useMemo(() => bookings.map((booking) => {
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
      editable: !isCancelled && !isListView,
      extendedProps: { booking },
    };
  }), [bookings, isListView]);

  const changeView = useCallback((view: ViewKey) => {
    calRef.current?.getApi().changeView(view);
    setCurrentView(view);
  }, []);

  const handleDatesSet = useCallback(
    (info: DatesSetArg) => {
      setTitle(info.view.title);
      onRangeChange(info.startStr, info.endStr);
    },
    [onRangeChange]
  );

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      const booking: Booking | undefined = info.event.extendedProps.booking;
      if (booking) onEventClick(booking);
    },
    [onEventClick]
  );

  const autoEnd = useCallback(
    (start: Date) => new Date(start.getTime() + 2.5 * 60 * 60 * 1000),
    []
  );

  // Drag-to-select on desktop — ignore FullCalendar's end, always use start + 2.5 h
  const handleDateSelect = useCallback(
    (info: DateSelectArg) => {
      onDateSelect(info.start, autoEnd(info.start));
      calRef.current?.getApi().unselect();
    },
    [onDateSelect, autoEnd]
  );

  // Single tap on an empty slot — fires immediately on touch, no long-press needed
  const handleDateClick = useCallback(
    (info: DateClickArg) => {
      onDateSelect(info.date, autoEnd(info.date));
    },
    [onDateSelect, autoEnd]
  );

  const handleEventDrop = useCallback(
    async (info: EventDropArg) => {
      const booking: Booking | undefined = info.event.extendedProps.booking;
      const newStart = info.event.start;
      const newEnd = info.event.end;
      if (!booking || !newStart || !newEnd) { info.revert(); return; }

      setDropError("");
      try {
        await update.mutateAsync({
          id: booking.id,
          input: { startTime: newStart.toISOString(), endTime: newEnd.toISOString() },
        });
      } catch (err: any) {
        info.revert();
        setDropError(err.message ?? "Could not move booking.");
      }
    },
    [update]
  );

  const api = calRef.current?.getApi();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* ── Custom header ── */}
      <div className="px-3 pt-3 pb-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => api?.prev()}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => api?.next()}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              aria-label="Next"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <h2 className="text-base font-semibold text-gray-800 tabular-nums">{title}</h2>

          <button
            onClick={() => api?.today()}
            className="text-sm font-medium text-sky-600 px-2.5 py-1 rounded-lg hover:bg-sky-50 active:bg-sky-100 transition-colors shrink-0"
          >
            Today
          </button>
        </div>

        {/* Segmented view switcher */}
        <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
          {VIEW_OPTIONS.map((v) => (
            <button
              key={v.key}
              onClick={() => changeView(v.key)}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                currentView === v.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drop error */}
      {dropError && (
        <div className="mx-3 mb-2 flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
          <span>{dropError}</span>
          <button onClick={() => setDropError("")} className="ml-2 text-red-400 hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Calendar */}
      <div className="px-3 pb-3">
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView={initialView}
          headerToolbar={false}
          events={events}
          editable={!isListView}
          eventDurationEditable={false}
          selectable={!isListView}
          selectMirror
          selectMinDistance={5}
          dayMaxEvents={3}
          weekends
          height={isListView ? "calc(100dvh - 230px)" : "auto"}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          slotDuration="00:30:00"
          nowIndicator
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          select={handleDateSelect}
          dateClick={handleDateClick}
          datesSet={handleDatesSet}
          eventContent={(info) => <EventContent info={info} />}
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          listDayFormat={{ weekday: "long", day: "numeric", month: "long" }}
          listDaySideFormat={false}
          noEventsText="No bookings this period"
          businessHours={{ daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: "08:00", endTime: "20:00" }}
        />
      </div>
    </div>
  );
}

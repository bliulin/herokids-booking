import { google } from "googleapis";
import { config } from "@/lib/config";
import type { Booking } from "@/db/schema";
import { bookingTypeLabels, paymentStatusLabels, bookingStatusLabels } from "@/types/booking";

export interface CalendarSyncResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

function isConfigured(): boolean {
  const { clientId, clientSecret, refreshToken } = config.googleCalendar;
  return Boolean(clientId && clientSecret && refreshToken);
}

function getClient() {
  const { clientId, clientSecret, redirectUri, refreshToken } = config.googleCalendar;
  const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  auth.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth });
}

function buildEventTitle(booking: Booking): string {
  const type = bookingTypeLabels[booking.bookingType];
  return `${type} - ${booking.customerName} - ${booking.numberOfChildren} kids`;
}

function toRfc3339(dt: string): string {
  // Stored as "2026-06-20T11:00" — Google requires seconds
  return dt.length === 16 ? `${dt}:00` : dt;
}

function buildEventDescription(booking: Booking): string {
  const lines = [
    `Customer: ${booking.customerName}`,
    `Phone: ${booking.phone}`,
    booking.email ? `Email: ${booking.email}` : null,
    `Children: ${booking.numberOfChildren}`,
    `Type: ${bookingTypeLabels[booking.bookingType]}`,
    `Status: ${bookingStatusLabels[booking.status]}`,
    `Payment: ${paymentStatusLabels[booking.paymentStatus]}`,
    booking.notes ? `\nNotes: ${booking.notes}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}

export async function createCalendarEvent(booking: Booking): Promise<CalendarSyncResult> {
  if (!isConfigured()) {
    return { success: false, error: "Google Calendar not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in .env." };
  }

  try {
    const calendar = getClient();
    const event = await calendar.events.insert({
      calendarId: config.googleCalendar.calendarId,
      requestBody: {
        summary: buildEventTitle(booking),
        description: buildEventDescription(booking),
        start: { dateTime: toRfc3339(booking.startTime), timeZone: "Europe/Bucharest" },
        end: { dateTime: toRfc3339(booking.endTime), timeZone: "Europe/Bucharest" },
        status: booking.status === "cancelled" ? "cancelled" : "confirmed",
      },
    });

    return { success: true, eventId: event.data.id ?? undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Google Calendar API error: ${message}` };
  }
}

export async function updateCalendarEvent(booking: Booking): Promise<CalendarSyncResult> {
  if (!isConfigured()) {
    return { success: false, error: "Google Calendar not configured." };
  }

  if (!booking.googleCalendarEventId) {
    // No existing event — create one instead
    return createCalendarEvent(booking);
  }

  try {
    const calendar = getClient();
    await calendar.events.update({
      calendarId: config.googleCalendar.calendarId,
      eventId: booking.googleCalendarEventId,
      requestBody: {
        summary: buildEventTitle(booking),
        description: buildEventDescription(booking),
        start: { dateTime: toRfc3339(booking.startTime), timeZone: "Europe/Bucharest" },
        end: { dateTime: toRfc3339(booking.endTime), timeZone: "Europe/Bucharest" },
        status: booking.status === "cancelled" ? "cancelled" : "confirmed",
      },
    });

    return { success: true, eventId: booking.googleCalendarEventId };
  } catch (err: any) {
    // If the event was deleted from Google Calendar, create a new one
    if (err?.code === 404 || err?.status === 404) {
      return createCalendarEvent(booking);
    }
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Google Calendar API error: ${message}` };
  }
}

export async function cancelCalendarEvent(eventId: string): Promise<CalendarSyncResult> {
  if (!isConfigured()) {
    return { success: false, error: "Google Calendar not configured." };
  }

  try {
    const calendar = getClient();
    await calendar.events.patch({
      calendarId: config.googleCalendar.calendarId,
      eventId,
      requestBody: { status: "cancelled" },
    });
    return { success: true, eventId };
  } catch (err: any) {
    if (err?.code === 404 || err?.status === 404) {
      // Already gone from Google — that's fine
      return { success: true, eventId };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Google Calendar API error: ${message}` };
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getBookings, createBooking, BookingError } from "@/services/bookingService";
import { createBookingSchema } from "@/types/booking";

export async function GET(req: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const data = await getBookings(from, to);
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const booking = await createBooking(parsed.data);
    return NextResponse.json({ data: booking }, { status: 201 });
  } catch (err) {
    if (err instanceof BookingError) {
      const status = err.code === "capacity_exceeded" ? 409 : 400;
      return NextResponse.json({ error: err.message, code: err.code, details: err.details }, { status });
    }
    console.error("Unexpected error creating booking:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

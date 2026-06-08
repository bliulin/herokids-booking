import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getBookingById,
  updateBooking,
  cancelBooking,
  BookingError,
} from "@/services/bookingService";
import { createBookingSchema } from "@/types/booking";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const booking = await getBookingById(numId);
    return NextResponse.json({ data: booking });
  } catch (err) {
    if (err instanceof BookingError && err.code === "not_found") {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createBookingSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const booking = await updateBooking(numId, parsed.data);
    return NextResponse.json({ data: booking });
  } catch (err) {
    if (err instanceof BookingError) {
      if (err.code === "not_found") return NextResponse.json({ error: err.message }, { status: 404 });
      if (err.code === "capacity_exceeded") return NextResponse.json({ error: err.message, code: err.code, details: err.details }, { status: 409 });
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Unexpected error updating booking:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const authError = await requireAuth();
  if (authError) return authError;

  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const booking = await cancelBooking(numId);
    return NextResponse.json({ data: booking });
  } catch (err) {
    if (err instanceof BookingError && err.code === "not_found") {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

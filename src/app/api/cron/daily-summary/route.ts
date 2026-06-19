import { NextRequest, NextResponse } from "next/server";
import { getBookings } from "@/services/bookingService";
import { sendDailySummaryEmail } from "@/services/emailService";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Compute tomorrow's date (UTC+3 EEST: at 18:00 UTC = 21:00 local, tomorrow = next UTC day)
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const dateStr = tomorrow.toISOString().split("T")[0]; // "YYYY-MM-DD"

  try {
    const all = await getBookings(`${dateStr}T00:00:00`, `${dateStr}T23:59:59`);
    const active = all.filter((b) => b.status !== "cancelled");

    await sendDailySummaryEmail(active, tomorrow);

    return NextResponse.json({ ok: true, date: dateStr, sent: active.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

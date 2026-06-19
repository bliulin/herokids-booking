import cron from "node-cron";
import { getBookings } from "@/services/bookingService";
import { sendDailySummaryEmail } from "@/services/emailService";

async function runDailySummary() {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const dateStr = tomorrow.toISOString().split("T")[0];

  const all = await getBookings(`${dateStr}T00:00:00`, `${dateStr}T23:59:59`);
  const active = all.filter((b) => b.status !== "cancelled");

  await sendDailySummaryEmail(active, tomorrow);
  console.log(`[cron] Daily summary sent for ${dateStr} (${active.length} bookings)`);
}

export function startDailySummaryCron() {
  // Every day at 21:00 Romania time
  cron.schedule("0 21 * * *", () => {
    runDailySummary().catch((err) => console.error("[cron] Daily summary failed:", err));
  }, { timezone: "Europe/Bucharest" });

  console.log("[cron] Daily summary cron scheduled (21:00 Europe/Bucharest)");
}

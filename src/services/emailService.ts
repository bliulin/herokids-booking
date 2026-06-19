import { Resend } from "resend";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import type { Booking } from "@/db/schema";
import { config } from "@/lib/config";

const resend = new Resend(process.env.RESEND_API_KEY);

const BOOKING_TYPE_LABELS: Record<string, string> = {
  standard: "Standard",
  hero: "Hero",
  vip: "VIP",
  walk_in: "Walk-in",
  atelier: "Atelier",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "Neachitat",
  deposit_paid: "Avans",
  paid_in_full: "Achitat",
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#16a34a",
  pending: "#d97706",
  cancelled: "#dc2626",
};

function formatTime(iso: string) {
  return iso.substring(11, 16); // "HH:mm" from ISO string, no timezone conversion
}

function buildHtml(activeBookings: Booking[], dateLabel: string): string {
  if (activeBookings.length === 0) {
    return `
<div style="font-family:sans-serif;max-width:640px;margin:0 auto;padding:32px 24px;background:#f8fafc;">
  <div style="background:white;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <h1 style="margin:0 0 4px;font-size:20px;color:#0369a1;">HeroKids — Program de mâine</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">${dateLabel}</p>
    <p style="color:#64748b;font-size:15px;">Nu există rezervări pentru mâine.</p>
  </div>
</div>`;
  }

  const rows = activeBookings
    .map(
      (b) => `
    <tr>
      <td style="padding:10px 12px;font-weight:600;white-space:nowrap;">${formatTime(b.startTime)} – ${formatTime(b.endTime)}</td>
      <td style="padding:10px 12px;">${b.customerName}</td>
      <td style="padding:10px 12px;text-align:center;">${b.numberOfChildren}</td>
      <td style="padding:10px 12px;">${BOOKING_TYPE_LABELS[b.bookingType] ?? b.bookingType}</td>
      <td style="padding:10px 12px;">${b.phone}</td>
      <td style="padding:10px 12px;">
        <span style="color:${STATUS_COLORS[b.status] ?? "#374151"};">
          ${PAYMENT_STATUS_LABELS[b.paymentStatus] ?? b.paymentStatus}
        </span>
      </td>
      <td style="padding:10px 12px;color:#64748b;font-style:italic;">${b.notes ?? ""}</td>
    </tr>`
    )
    .join("\n");

  return `
<div style="font-family:sans-serif;max-width:720px;margin:0 auto;padding:32px 24px;background:#f8fafc;">
  <div style="background:white;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <h1 style="margin:0 0 4px;font-size:20px;color:#0369a1;">HeroKids — Program de mâine</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">${dateLabel} · ${activeBookings.length} rezervări</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#f0f9ff;color:#0369a1;text-align:left;">
          <th style="padding:10px 12px;font-weight:600;">Orar</th>
          <th style="padding:10px 12px;font-weight:600;">Client</th>
          <th style="padding:10px 12px;font-weight:600;text-align:center;">Copii</th>
          <th style="padding:10px 12px;font-weight:600;">Tip</th>
          <th style="padding:10px 12px;font-weight:600;">Telefon</th>
          <th style="padding:10px 12px;font-weight:600;">Plată</th>
          <th style="padding:10px 12px;font-weight:600;">Note</th>
        </tr>
      </thead>
      <tbody style="color:#1e293b;">
        ${rows}
      </tbody>
    </table>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px;">HeroKids Play Space</p>
</div>`;
}

export async function sendDailySummaryEmail(activeBookings: Booking[], tomorrowDate: Date) {
  const dateLabel = format(tomorrowDate, "EEEE, d MMMM yyyy", { locale: ro });

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "contact@herokids.ro",
    to: config.auth.allowedEmails,
    subject: `HeroKids – ${format(tomorrowDate, "d MMM", { locale: ro })} – ${activeBookings.length} rezervări`,
    html: buildHtml(activeBookings, dateLabel),
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

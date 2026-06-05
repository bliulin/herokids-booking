import { db, pgClient } from "./index";
import { bookings } from "./schema";
import { addDays } from "date-fns";

const today = new Date();
today.setHours(0, 0, 0, 0);

function dt(daysOffset: number, hour: number, minute = 0): string {
  const d = addDays(today, daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const seedData = [
  {
    customerName: "Emma Thompson",
    phone: "+40 721 123 456",
    email: "emma.thompson@email.com",
    numberOfChildren: 8,
    bookingType: "standard" as const,
    startTime: dt(0, 10),
    endTime: dt(0, 12),
    status: "confirmed" as const,
    paymentStatus: "paid_in_full" as const,
    notes: "Kids are ages 3-6. Please set up the soft play area.",
    calendarSyncStatus: "not_synced" as const,
  },
  {
    customerName: "James Wilson",
    phone: "+40 722 234 567",
    email: "jwilson@gmail.com",
    numberOfChildren: 15,
    bookingType: "hero" as const,
    startTime: dt(1, 14),
    endTime: dt(1, 17),
    status: "confirmed" as const,
    paymentStatus: "deposit_paid" as const,
    notes: "Birthday for Lily, turning 5. Cake provided by customer.",
    calendarSyncStatus: "not_synced" as const,
  },
  {
    customerName: "Sarah Chen",
    phone: "+40 733 345 678",
    email: null,
    numberOfChildren: 5,
    bookingType: "standard" as const,
    startTime: dt(1, 10),
    endTime: dt(1, 11, 30),
    status: "pending" as const,
    paymentStatus: "unpaid" as const,
    notes: null,
    calendarSyncStatus: "not_synced" as const,
  },
  {
    customerName: "Michael Brown",
    phone: "+40 744 456 789",
    email: "mbrown@outlook.com",
    numberOfChildren: 25,
    bookingType: "vip" as const,
    startTime: dt(3, 9),
    endTime: dt(3, 13),
    status: "confirmed" as const,
    paymentStatus: "deposit_paid" as const,
    notes: "Company family fun day. All ages.",
    calendarSyncStatus: "not_synced" as const,
  },
  {
    customerName: "Olivia Martinez",
    phone: "+40 755 567 890",
    email: "olivia.m@email.com",
    numberOfChildren: 12,
    bookingType: "hero" as const,
    startTime: dt(5, 11),
    endTime: dt(5, 14),
    status: "pending" as const,
    paymentStatus: "unpaid" as const,
    notes: "Peanut allergy - no nut products near the venue that day.",
    calendarSyncStatus: "not_synced" as const,
  },
  {
    customerName: "David Harris",
    phone: "+40 766 678 901",
    email: null,
    numberOfChildren: 6,
    bookingType: "standard" as const,
    startTime: dt(-2, 15),
    endTime: dt(-2, 17),
    status: "confirmed" as const,
    paymentStatus: "paid_in_full" as const,
    notes: null,
    calendarSyncStatus: "not_synced" as const,
  },
  {
    customerName: "Lisa Taylor",
    phone: "+40 777 789 012",
    email: "lisa.taylor@gmail.com",
    numberOfChildren: 10,
    bookingType: "walk_in" as const,
    startTime: dt(7, 10),
    endTime: dt(7, 12),
    status: "cancelled" as const,
    paymentStatus: "unpaid" as const,
    notes: "Customer cancelled - holiday clash.",
    calendarSyncStatus: "not_synced" as const,
  },
  {
    customerName: "Tom Anderson",
    phone: "+40 788 890 123",
    email: "tanderson@company.ro",
    numberOfChildren: 20,
    bookingType: "atelier" as const,
    startTime: dt(10, 9),
    endTime: dt(10, 12),
    status: "confirmed" as const,
    paymentStatus: "deposit_paid" as const,
    notes: "School nursery visit. Staff: 4 teachers.",
    calendarSyncStatus: "not_synced" as const,
  },
];

async function seed() {
  console.log("Seeding database...");
  await db.delete(bookings);
  await db.insert(bookings).values(seedData);
  console.log(`Inserted ${seedData.length} bookings.`);
  await pgClient.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

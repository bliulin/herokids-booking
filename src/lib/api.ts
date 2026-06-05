import type { Booking, CreateBookingInput } from "@/types/booking";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const json = await res.json();

  if (!res.ok) {
    const message = json?.error ?? `Request failed with status ${res.status}`;
    const err = new Error(message) as Error & { code?: string; details?: unknown; status: number };
    err.code = json?.code;
    err.details = json?.details;
    err.status = res.status;
    throw err;
  }

  return json;
}

export const api = {
  bookings: {
    list: (from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const qs = params.toString();
      return fetchJson<{ data: Booking[] }>(`/api/bookings${qs ? `?${qs}` : ""}`);
    },
    get: (id: number) => fetchJson<{ data: Booking }>(`/api/bookings/${id}`),
    create: (input: CreateBookingInput) =>
      fetchJson<{ data: Booking }>("/api/bookings", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: number, input: Partial<CreateBookingInput>) =>
      fetchJson<{ data: Booking }>(`/api/bookings/${id}`, {
        method: "PUT",
        body: JSON.stringify(input),
      }),
    cancel: (id: number) =>
      fetchJson<{ data: Booking }>(`/api/bookings/${id}`, { method: "DELETE" }),
  },
};

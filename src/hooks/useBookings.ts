"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreateBookingInput } from "@/types/booking";

export function useBookings(from?: string, to?: string) {
  return useQuery({
    queryKey: ["bookings", from, to],
    queryFn: () => api.bookings.list(from, to).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

export function useBooking(id: number | null) {
  return useQuery({
    queryKey: ["booking", id],
    queryFn: () => api.bookings.get(id!).then((r) => r.data),
    enabled: id !== null,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => api.bookings.create(input).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useUpdateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<CreateBookingInput> }) =>
      api.bookings.update(id, input).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.setQueryData(["booking", data.id], data);
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.bookings.cancel(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

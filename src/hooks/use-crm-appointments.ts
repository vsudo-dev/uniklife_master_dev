import { useQuery } from "@tanstack/react-query";
import { getCrmBookings, getCrmBooking } from "@/lib/crm";

const CRM_STALE = 5 * 60 * 1000;

export function useCrmBookings(opts?: {
  from?: string;
  to?: string;
  contactId?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["crm-bookings", opts],
    queryFn: () => getCrmBookings(opts),
    staleTime: CRM_STALE,
  });
}

export function useCrmBooking(id: string | undefined) {
  return useQuery({
    queryKey: ["crm-booking", id],
    enabled: !!id,
    queryFn: () => getCrmBooking(id!),
    staleTime: CRM_STALE,
  });
}

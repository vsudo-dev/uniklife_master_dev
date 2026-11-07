import { useQuery } from "@tanstack/react-query";
import { getCrmContacts, getCrmContact, searchCrmContacts } from "@/lib/crm";

const CRM_STALE = 5 * 60 * 1000; // 5 min — preserve API quota (5000/month)

export function useCrmContacts() {
  return useQuery({
    queryKey: ["crm-contacts"],
    queryFn: getCrmContacts,
    staleTime: CRM_STALE,
  });
}

export function useCrmContact(id: string | undefined) {
  return useQuery({
    queryKey: ["crm-contact", id],
    enabled: !!id,
    queryFn: () => getCrmContact(id!),
    staleTime: CRM_STALE,
  });
}

export function useCrmContactSearch(query: string) {
  return useQuery({
    queryKey: ["crm-contacts-search", query],
    enabled: query.length > 1,
    queryFn: () => searchCrmContacts(query),
    staleTime: CRM_STALE,
  });
}

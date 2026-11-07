import { useQuery } from "@tanstack/react-query";
import { getCrmDocuments } from "@/lib/crm";

export function useCrmDocuments(contactId?: string) {
  return useQuery({
    queryKey: ["crm-documents", contactId ?? "all"],
    staleTime: 5 * 60 * 1000,
    queryFn: () => getCrmDocuments(contactId),
  });
}

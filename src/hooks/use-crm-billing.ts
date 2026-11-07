import { useQuery } from "@tanstack/react-query";
import { getCrmInvoices, getCrmInvoice, getCrmPayments, getCrmRevenueSummary } from "@/lib/crm";

const CRM_STALE = 5 * 60 * 1000;

export function useCrmInvoices(opts?: { contactId?: string; status?: string }) {
  return useQuery({
    queryKey: ["crm-invoices", opts],
    queryFn: () => getCrmInvoices(opts),
    staleTime: CRM_STALE,
  });
}

export function useCrmInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ["crm-invoice", id],
    enabled: !!id,
    queryFn: () => getCrmInvoice(id!),
    staleTime: CRM_STALE,
  });
}

export function useCrmPayments(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ["crm-payments", invoiceId],
    enabled: !!invoiceId,
    queryFn: () => getCrmPayments(invoiceId!),
    staleTime: CRM_STALE,
  });
}

export function useCrmRevenueSummary() {
  return useQuery({
    queryKey: ["crm-revenue-summary"],
    queryFn: getCrmRevenueSummary,
    staleTime: CRM_STALE,
  });
}

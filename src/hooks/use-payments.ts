import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Payment, RecordPaymentInput } from "@/types";

export function usePayments(invoiceId: string) {
  return useQuery({
    queryKey: ["payments", invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!invoiceId,
  });
}

export function usePaymentsByTenant(tenantId: string, limit = 50) {
  return useQuery({
    queryKey: ["payments-tenant", tenantId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .order("payment_date", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!tenantId,
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecordPaymentInput) => {
      const { data, error } = await supabase
        .from("payments")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Payment;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["payments", data.invoice_id] });
      qc.invalidateQueries({ queryKey: ["invoice", data.invoice_id] });
      qc.invalidateQueries({ queryKey: ["invoices", data.tenant_id] });
      qc.invalidateQueries({ queryKey: ["payments-tenant", data.tenant_id] });
    },
  });
}

export function useRevenueSummary(tenantId: string) {
  return useQuery({
    queryKey: ["revenue-summary", tenantId],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("payments")
        .select("amount, payment_date, status")
        .eq("tenant_id", tenantId)
        .eq("status", "completed");
      if (error) throw error;

      const allPayments = data as { amount: number; payment_date: string; status: string }[];
      const totalRevenue = allPayments.reduce((sum, p) => sum + p.amount, 0);
      const thisMonth = allPayments
        .filter((p) => new Date(p.payment_date) >= startOfMonth)
        .reduce((sum, p) => sum + p.amount, 0);

      return { totalRevenue, thisMonth };
    },
    enabled: !!tenantId,
  });
}

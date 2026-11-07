import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Invoice, InvoiceSummary, CreateInvoiceInput, InvoiceItem } from "@/types";

export function useInvoices(tenantId: string) {
  return useQuery({
    queryKey: ["invoices", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_summary")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as InvoiceSummary[];
    },
    enabled: !!tenantId,
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, invoice_items(*), payments(*), contacts(first_name, last_name, email)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Invoice;
    },
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateInvoiceInput) => {
      const { items, ...invoiceData } = input;

      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert(invoiceData)
        .select()
        .single();
      if (invErr) throw invErr;

      if (items.length > 0) {
        const { error: itemErr } = await supabase
          .from("invoice_items")
          .insert(
            items.map((item) => ({
              ...item,
              invoice_id: invoice.id,
              tenant_id: input.tenant_id,
            }))
          );
        if (itemErr) throw itemErr;
      }

      return invoice as Invoice;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["invoices", data.tenant_id] });
    },
  });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      paid_at,
    }: {
      id: string;
      status: Invoice["status"];
      paid_at?: string;
    }) => {
      const updates: Record<string, unknown> = { status };
      if (paid_at) updates.paid_at = paid_at;

      const { data, error } = await supabase
        .from("invoices")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Invoice;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["invoices", data.tenant_id] });
      qc.invalidateQueries({ queryKey: ["invoice", data.id] });
    },
  });
}

export function useInvoiceItems(invoiceId: string) {
  return useQuery({
    queryKey: ["invoice-items", invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("created_at");
      if (error) throw error;
      return data as InvoiceItem[];
    },
    enabled: !!invoiceId,
  });
}

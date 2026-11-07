import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Contact, CreateContactInput } from "@/types";

export function useContacts(tenantId: string) {
  return useQuery({
    queryKey: ["contacts", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("first_name");
      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!tenantId,
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ["contact", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Contact;
    },
    enabled: !!id,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateContactInput) => {
      const { data, error } = await supabase
        .from("contacts")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Contact;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["contacts", data.tenant_id] });
    },
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contact> & { id: string }) => {
      const { data, error } = await supabase
        .from("contacts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Contact;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["contacts", data.tenant_id] });
      qc.invalidateQueries({ queryKey: ["contact", data.id] });
    },
  });
}

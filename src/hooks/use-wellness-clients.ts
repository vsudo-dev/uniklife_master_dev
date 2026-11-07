import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { WellnessClient } from "@/types";

export function useWellnessClients(tenantId: string) {
  return useQuery({
    queryKey: ["wellness-clients", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wellness_clients")
        .select("*, contacts(*)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as WellnessClient[];
    },
    enabled: !!tenantId,
  });
}

export function useWellnessClient(id: string) {
  return useQuery({
    queryKey: ["wellness-client", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wellness_clients")
        .select("*, contacts(*)")
        .or(`id.eq.${id},contact_id.eq.${id}`)
        .maybeSingle();
      if (error) throw error;
      return data as WellnessClient | null;
    },
    enabled: !!id,
  });
}

export function useCreateWellnessClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tenant_id: string;
      contact_id: string;
      blood_type?: string;
      emergency_contact_name?: string;
      emergency_contact_phone?: string;
      lifestyle_notes?: string;
      primary_practitioner_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("wellness_clients")
        .upsert(input, { onConflict: "tenant_id,contact_id" })
        .select("*, contacts(*)")
        .single();
      if (error) throw error;
      return data as WellnessClient;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["wellness-clients", data.tenant_id] });
    },
  });
}

export function useUpdateWellnessClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WellnessClient> & { id: string }) => {
      const { data, error } = await supabase
        .from("wellness_clients")
        .update(updates)
        .eq("id", id)
        .select("*, contacts(*)")
        .single();
      if (error) throw error;
      return data as WellnessClient;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["wellness-clients", data.tenant_id] });
      qc.invalidateQueries({ queryKey: ["wellness-client", data.id] });
    },
  });
}

export function useUpdateWellnessStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from("wellness_clients")
        .update({ enrollment_status: status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["wellness-profile", data.contact_id] });
      qc.invalidateQueries({ queryKey: ["wellness-clients", data.tenant_id] });
    },
  });
}

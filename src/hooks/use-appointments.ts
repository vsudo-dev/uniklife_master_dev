import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Appointment, Service } from "@/types";

export function useAppointments(tenantId: string, filters?: { staffId?: string; date?: string }) {
  return useQuery({
    queryKey: ["appointments", tenantId, filters],
    queryFn: async () => {
      let q = supabase
        .from("appointments")
        .select("*, contacts(*), services(*)")
        .eq("tenant_id", tenantId)
        .order("scheduled_at", { ascending: true });

      if (filters?.staffId) q = q.eq("staff_user_id", filters.staffId);
      if (filters?.date) {
        const start = `${filters.date}T00:00:00`;
        const end = `${filters.date}T23:59:59`;
        q = q.gte("scheduled_at", start).lte("scheduled_at", end);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tenant_id: string;
      contact_id: string;
      service_id: string;
      staff_user_id: string;
      branch_id: string;
      scheduled_at: string;
      duration_minutes: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("appointments")
        .insert(input)
        .select("*, contacts(*), services(*)")
        .single();
      if (error) throw error;
      return data as Appointment;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["appointments", data.tenant_id] });
    },
  });
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      cancellation_reason,
    }: {
      id: string;
      status: Appointment["status"];
      cancellation_reason?: string;
    }) => {
      const updates: Record<string, unknown> = { status };
      if (cancellation_reason) updates.cancellation_reason = cancellation_reason;
      if (status === "checked_in") updates.check_in_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("appointments")
        .update(updates)
        .eq("id", id)
        .select("*, contacts(*), services(*)")
        .single();
      if (error) throw error;
      return data as Appointment;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["appointments", data.tenant_id] });
    },
  });
}

export function useServices(tenantId: string) {
  return useQuery({
    queryKey: ["services", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Service[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tenant_id: string;
      name: string;
      duration_minutes: number;
      price?: number;
      currency?: string;
      description?: string;
      category?: string;
    }) => {
      const { data, error } = await supabase
        .from("services")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Service;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["services", data.tenant_id] });
    },
  });
}

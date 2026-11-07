import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { WellnessProgram, WellnessEnrollment } from "@/types";

export function usePrograms(tenantId: string) {
  return useQuery({
    queryKey: ["programs", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wellness_programs")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name");
      if (error) throw error;
      return data as WellnessProgram[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tenant_id: string;
      name: string;
      duration_days: number;
      program_type: WellnessProgram["program_type"];
      price?: number;
      currency?: string;
      description?: string;
      session_credits?: number;
      requires_payment?: boolean;
      refund_policy?: string;
    }) => {
      const { data, error } = await supabase
        .from("wellness_programs")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as WellnessProgram;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["programs", data.tenant_id] });
    },
  });
}

export function useUpdateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WellnessProgram> & { id: string }) => {
      const { data, error } = await supabase
        .from("wellness_programs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as WellnessProgram;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["programs", data.tenant_id] });
    },
  });
}

export function useEnrollments(clientId: string) {
  return useQuery({
    queryKey: ["enrollments", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wellness_enrollments")
        .select("*, wellness_programs(*)")
        .eq("client_id", clientId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as WellnessEnrollment[];
    },
    enabled: !!clientId,
  });
}

export function useEnrollClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tenant_id: string;
      client_id: string;
      program_id: string;
      start_date: string;
      end_date: string;
      sessions_total: number;
      enrolled_by: string;
      enrollment_payment_status?: WellnessEnrollment["enrollment_payment_status"];
      enrollment_payment_ref?: string;
    }) => {
      const { data, error } = await supabase
        .from("wellness_enrollments")
        .insert(input)
        .select("*, wellness_programs(*)")
        .single();
      if (error) throw error;
      return data as WellnessEnrollment;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["enrollments", data.client_id] });
    },
  });
}

export function useUpdateEnrollmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: WellnessEnrollment["status"];
    }) => {
      const { data, error } = await supabase
        .from("wellness_enrollments")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as WellnessEnrollment;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["enrollments", data.client_id] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { StaffProfile, StaffStatus } from "@/types";

export interface StaffProfileWithUser extends StaffProfile {
  platform_users: { email: string; full_name: string };
  branches: { name: string } | null;
}

export function useStaffProfiles(tenantId: string) {
  return useQuery({
    queryKey: ["staff-profiles", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_profiles")
        .select("*, platform_users(email, full_name), branches(name)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as StaffProfileWithUser[];
    },
  });
}

export function useUpsertStaffProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tenant_id: string;
      user_id: string;
      job_title?: string;
      specialization?: string;
      branch_id?: string;
      hire_date?: string;
      bio?: string;
      status?: StaffStatus;
    }) => {
      const { data, error } = await supabase
        .from("staff_profiles")
        .upsert(input, { onConflict: "tenant_id,user_id" })
        .select("*, platform_users(email, full_name), branches(name)")
        .single();
      if (error) throw error;
      return data as StaffProfileWithUser;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["staff-profiles", data.tenant_id] });
    },
  });
}

export function useUpdateStaffStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, tenant_id }: { id: string; status: StaffStatus; tenant_id: string }) => {
      const { data, error } = await supabase
        .from("staff_profiles")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, tenant_id } as StaffProfile & { tenant_id: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["staff-profiles", data.tenant_id] });
    },
  });
}

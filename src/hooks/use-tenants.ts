import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/use-auth";
import type { Tenant, TenantStatus, SubscriptionTier } from "@/types";

export interface CreateTenantInput {
  name: string;
  slug: string;
  status?: TenantStatus;
  subscription_tier?: SubscriptionTier;
}

export interface UpdateTenantInput {
  name?: string;
  slug?: string;
  status?: TenantStatus;
  subscription_tier?: SubscriptionTier;
  crm_contact_tag?: string | null;
  crm_tag_strict_mode?: boolean;
}

export function useTenants() {
  return useQuery({
    queryKey: ["tenants"],
    queryFn: async (): Promise<Tenant[]> => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Tenant[];
    },
  });
}

export function useTenant(id: string | undefined) {
  return useQuery({
    queryKey: ["tenants", id],
    enabled: !!id,
    queryFn: async (): Promise<Tenant> => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", id!)
        .single();

      if (error) throw error;
      return data as Tenant;
    },
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (input: CreateTenantInput) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("tenants")
        .insert({ ...input, created_by: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as Tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

export function useUpdateTenant(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTenantInput) => {
      const { data, error } = await supabase
        .from("tenants")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

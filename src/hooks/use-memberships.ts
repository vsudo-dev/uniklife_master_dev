import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/use-auth";
import type { TenantMembership, TenantRole, MembershipStatus } from "@/types";

export interface MembershipWithUser extends TenantMembership {
  platform_users: {
    email: string;
    full_name: string;
    platform_role: string;
  };
}

export interface CreateMembershipInput {
  tenant_id: string;
  email: string;
  role: TenantRole;
}

export function useMemberships(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["memberships", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<MembershipWithUser[]> => {
      const { data, error } = await supabase
        .from("tenant_memberships")
        .select("*, platform_users!user_id(email, full_name, platform_role)")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MembershipWithUser[];
    },
  });
}

export function useAddMember() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (input: CreateMembershipInput) => {
      const { data: user, error: userError } = await supabase
        .from("platform_users")
        .select("id")
        .eq("email", input.email)
        .single();

      if (userError || !user) {
        throw new Error(
          "User not found. They must sign up on the platform first."
        );
      }

      const { data, error } = await supabase
        .from("tenant_memberships")
        .insert({
          tenant_id: input.tenant_id,
          user_id: user.id,
          role: input.role,
          status: "active",
          invited_by: currentUser?.id ?? null,
          joined_at: new Date().toISOString(),
        })
        .select("*, platform_users!user_id(email, full_name, platform_role)")
        .single();

      if (error) throw error;
      return data as MembershipWithUser;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["memberships", variables.tenant_id],
      });
    },
  });
}

export function useUpdateMembership(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      role,
      status,
    }: {
      id: string;
      role?: TenantRole;
      status?: MembershipStatus;
    }) => {
      const updates: Record<string, string> = {};
      if (role) updates.role = role;
      if (status) updates.status = status;

      const { data, error } = await supabase
        .from("tenant_memberships")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as TenantMembership;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["memberships", tenantId],
      });
    },
  });
}

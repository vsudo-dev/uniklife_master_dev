import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/use-auth";
import type { SupportPermissionGrant, GrantStatus } from "@/types";

export interface GrantWithUsers extends SupportPermissionGrant {
  grantee: { email: string; full_name: string };
  grantor: { email: string; full_name: string };
  tenant: { name: string } | null;
}

export interface CreateGrantInput {
  grantee_email: string;
  permission_key: string;
  tenant_scope_id?: string;
  allowed_actions: string[];
  requires_approval: boolean;
  effective_at: string;
  expires_at: string;
  reason: string;
}

export function useDelegations() {
  return useQuery({
    queryKey: ["delegations"],
    queryFn: async (): Promise<GrantWithUsers[]> => {
      const { data, error } = await supabase
        .from("support_permission_grants")
        .select(
          "*, grantee:platform_users!grantee_user_id(email, full_name), grantor:platform_users!granted_by_user_id(email, full_name), tenant:tenants!tenant_scope_id(name)"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as GrantWithUsers[];
    },
  });
}

export function useCreateGrant() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (input: CreateGrantInput) => {
      if (!currentUser) throw new Error("Not authenticated");
      const { data: grantee, error: granteeError } = await supabase
        .from("platform_users")
        .select("id")
        .eq("email", input.grantee_email)
        .single();

      if (granteeError || !grantee) {
        throw new Error("Grantee not found. They must have a platform account.");
      }

      const { data, error } = await supabase
        .from("support_permission_grants")
        .insert({
          grantee_user_id: grantee.id,
          granted_by_user_id: currentUser.id,
          permission_key: input.permission_key,
          tenant_scope_id: input.tenant_scope_id || null,
          allowed_actions: input.allowed_actions,
          requires_approval: input.requires_approval,
          effective_at: input.effective_at,
          expires_at: input.expires_at,
          reason: input.reason,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegations"] });
    },
  });
}

export function useRevokeGrant() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      grantId,
      reason,
    }: {
      grantId: string;
      reason: string;
    }) => {
      const { error } = await supabase
        .from("support_permission_grants")
        .update({
          status: "revoked" as GrantStatus,
          revoked_at: new Date().toISOString(),
          revoked_reason: reason,
          revoked_by: currentUser?.id ?? null,
        })
        .eq("id", grantId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegations"] });
    },
  });
}

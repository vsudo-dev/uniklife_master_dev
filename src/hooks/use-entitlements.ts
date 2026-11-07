import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/use-auth";
import type { TenantEntitlement } from "@/types";

export function useEntitlements(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["entitlements", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<TenantEntitlement[]> => {
      const { data, error } = await supabase
        .from("tenant_entitlements")
        .select("*, global_modules(*)")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TenantEntitlement[];
    },
  });
}

interface AssignModuleInput {
  tenant_id: string;
  module_id: string;
  expiry_date?: string;
  trial_end_date?: string;
  change_reason?: string;
}

export function useAssignModule() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: async (input: AssignModuleInput) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("tenant_entitlements")
        .insert({ ...input, assigned_by: user.id, status: "pending" })
        .select("*, global_modules(*)")
        .single();
      if (error) throw error;
      return data as TenantEntitlement;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["entitlements", v.tenant_id] }),
  });
}

interface TransitionInput {
  entitlement_id: string;
  new_status: string;
  reason?: string;
  tenant_id: string;
}

export function useTransitionEntitlement() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: async (input: TransitionInput) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.rpc("transition_entitlement", {
        p_entitlement_id: input.entitlement_id,
        p_new_status: input.new_status,
        p_actor_id: user.id,
        p_reason: input.reason ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["entitlements", v.tenant_id] }),
  });
}

// Batch-assign + activate a list of module keys in dependency order.
// Skips modules already assigned; activates pending ones in topological order.
export function useBatchActivateModules() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      tenantId,
      orderedKeys, // already in topological order from resolveActivationOrder()
      allModules,
      existingEntitlements,
    }: {
      tenantId: string;
      orderedKeys: string[];
      allModules: import("@/types").GlobalModule[];
      existingEntitlements: TenantEntitlement[];
    }) => {
      if (!user) throw new Error("Not authenticated");

      const keyToModule = new Map(allModules.map((m) => [m.key, m]));
      const existingByModuleId = new Map(existingEntitlements.map((e) => [e.module_id, e]));

      for (const key of orderedKeys) {
        const mod = keyToModule.get(key);
        if (!mod) continue;

        let entitlement = existingByModuleId.get(mod.id);

        // Step 1: Assign if not yet assigned
        if (!entitlement) {
          const { data, error } = await supabase
            .from("tenant_entitlements")
            .insert({ tenant_id: tenantId, module_id: mod.id, assigned_by: user.id, status: "pending" })
            .select("*, global_modules(*)")
            .single();
          if (error) throw error;
          entitlement = data as TenantEntitlement;
        }

        // Step 2: Activate if not already active
        if (entitlement && entitlement.status !== "active") {
          const { error } = await supabase.rpc("transition_entitlement", {
            p_entitlement_id: entitlement.id,
            p_new_status: "active",
            p_actor_id: user.id,
            p_reason: "Bundle activation",
          });
          if (error) throw error;
        }
      }
    },
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["entitlements", vars.tenantId] }),
  });
}

export function useRemoveEntitlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, tenant_id }: { id: string; tenant_id: string }) => {
      const { error } = await supabase
        .from("tenant_entitlements")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return tenant_id;
    },
    onSuccess: (tenantId) => qc.invalidateQueries({ queryKey: ["entitlements", tenantId] }),
  });
}

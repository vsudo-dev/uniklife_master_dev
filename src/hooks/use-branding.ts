import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/use-auth";
import type { TenantBranding } from "@/types";

export function useBranding(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["branding", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<TenantBranding | null> => {
      const { data, error } = await supabase
        .from("tenant_branding")
        .select("*")
        .eq("tenant_id", tenantId!)
        .maybeSingle();
      if (error) throw error;
      return data as TenantBranding | null;
    },
  });
}

type BrandingInput = Omit<TenantBranding, "id" | "created_at" | "updated_at" | "updated_by">;

export function useUpsertBranding() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: async (input: BrandingInput) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("tenant_branding")
        .upsert({ ...input, updated_by: user.id }, { onConflict: "tenant_id" })
        .select()
        .single();
      if (error) throw error;
      return data as TenantBranding;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["branding", v.tenant_id] }),
  });
}

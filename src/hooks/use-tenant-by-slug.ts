import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Tenant } from "@/types";

export function useTenantBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["tenant-by-slug", slug],
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("slug", slug!)
        .single();

      if (error || !data) throw new Error(`Tenant not found: ${slug}`);
      return data as Tenant;
    },
  });
}

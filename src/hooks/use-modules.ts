import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { GlobalModule } from "@/types";

export function useModules(layer?: string) {
  return useQuery({
    queryKey: ["modules", layer],
    queryFn: async (): Promise<GlobalModule[]> => {
      let q = supabase.from("global_modules").select("*").order("key");
      if (layer) q = q.eq("layer", layer);
      const { data, error } = await q;
      if (error) throw error;
      return data as GlobalModule[];
    },
  });
}

export function useModule(id: string | undefined) {
  return useQuery({
    queryKey: ["modules", id],
    enabled: !!id,
    queryFn: async (): Promise<GlobalModule> => {
      const { data, error } = await supabase
        .from("global_modules")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as GlobalModule;
    },
  });
}

export function useUpdateModule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GlobalModule> & { id: string }) => {
      const { data, error } = await supabase
        .from("global_modules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as GlobalModule;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["modules"] }),
  });
}

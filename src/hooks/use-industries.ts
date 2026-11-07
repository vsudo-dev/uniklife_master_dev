import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { IndustryProfile } from "@/types";

export function useIndustries() {
  return useQuery({
    queryKey: ["industries"],
    queryFn: async (): Promise<IndustryProfile[]> => {
      const { data, error } = await supabase
        .from("industry_profiles")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as IndustryProfile[];
    },
  });
}

export function useCreateIndustry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<IndustryProfile, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("industry_profiles")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as IndustryProfile;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["industries"] }),
  });
}

export function useUpdateIndustry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<IndustryProfile> & { id: string }) => {
      const { data, error } = await supabase
        .from("industry_profiles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as IndustryProfile;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["industries"] }),
  });
}

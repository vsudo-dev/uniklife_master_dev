import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Branch, BranchStatus } from "@/types";

export interface CreateBranchInput {
  tenant_id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  is_primary?: boolean;
}

export interface UpdateBranchInput {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  status?: BranchStatus;
}

export function useBranches(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["branches", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<Branch[]> => {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("is_primary", { ascending: false })
        .order("name");

      if (error) throw error;
      return data as Branch[];
    },
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBranchInput) => {
      const { data, error } = await supabase
        .from("branches")
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data as Branch;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["branches", variables.tenant_id],
      });
    },
  });
}

export function useUpdateBranch(branchId: string, tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateBranchInput) => {
      const { data, error } = await supabase
        .from("branches")
        .update(input)
        .eq("id", branchId)
        .select()
        .single();

      if (error) throw error;
      return data as Branch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["branches", tenantId],
      });
    },
  });
}

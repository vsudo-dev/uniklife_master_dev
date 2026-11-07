import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/use-auth";
import type { BranchAssignment } from "@/types";

export interface AssignmentWithDetails extends BranchAssignment {
  branch: { name: string };
  membership: {
    role: string;
    platform_users: { full_name: string; email: string };
  };
}

export function useBranchAssignments(branchId: string | undefined) {
  return useQuery({
    queryKey: ["branch-assignments", branchId],
    enabled: !!branchId,
    queryFn: async (): Promise<AssignmentWithDetails[]> => {
      const { data, error } = await supabase
        .from("branch_assignments")
        .select(
          "*, branch:branches!branch_id(name), membership:tenant_memberships!membership_id(role, platform_users(full_name, email))"
        )
        .eq("branch_id", branchId!)
        .is("removed_at", null)
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      return data as AssignmentWithDetails[];
    },
  });
}

export function useAssignToBranch() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      membershipId,
      branchId,
    }: {
      membershipId: string;
      branchId: string;
    }) => {
      const { data, error } = await supabase
        .from("branch_assignments")
        .insert({
          membership_id: membershipId,
          branch_id: branchId,
          assigned_by: currentUser?.id ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BranchAssignment;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["branch-assignments", variables.branchId],
      });
    },
  });
}

export function useRemoveBranchAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      branchId,
    }: {
      assignmentId: string;
      branchId: string;
    }) => {
      const { error } = await supabase
        .from("branch_assignments")
        .update({ removed_at: new Date().toISOString() })
        .eq("id", assignmentId);

      if (error) throw error;
      return branchId;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["branch-assignments", variables.branchId],
      });
    },
  });
}

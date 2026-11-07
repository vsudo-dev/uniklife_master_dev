import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/hooks/use-auth";
import type { SupportTeamMember, SupportTeamStatus } from "@/types";

export interface SupportTeamMemberWithUser extends SupportTeamMember {
  platform_users: { email: string; full_name: string; platform_role: string; status: string };
  added_by_user: { full_name: string } | null;
}

export function useSupportTeam() {
  return useQuery({
    queryKey: ["support-team"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_team_members")
        .select(
          "*, platform_users!user_id(email, full_name, platform_role, status), added_by_user:platform_users!added_by(full_name)"
        )
        .neq("status", "removed")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SupportTeamMemberWithUser[];
    },
  });
}

export function useActiveSupportMembers() {
  return useQuery({
    queryKey: ["support-team", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_team_members")
        .select("*, platform_users!user_id(email, full_name)")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as (SupportTeamMember & {
        platform_users: { email: string; full_name: string };
      })[];
    },
  });
}

async function setUserRole(userId: string, role: "support_ops" | "tenant_user") {
  const { error } = await supabase
    .from("platform_users")
    .update({ platform_role: role })
    .eq("id", userId);
  if (error) throw error;
}

export function useAddSupportMember() {
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (input: { email: string; label?: string; notes?: string }) => {
      if (!currentUser) throw new Error("Not authenticated");

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Session expired. Please sign in again.");

      if (currentUser.platform_role !== "super_admin") {
        throw new Error("Only Super Admins can add support team members.");
      }

      const { data: user, error: userError } = await supabase
        .from("platform_users")
        .select("id, platform_role")
        .eq("email", input.email.trim())
        .single();

      if (userError || !user) {
        throw new Error("User not found. They must have a platform account first.");
      }

      if (user.platform_role === "super_admin") {
        throw new Error("Cannot add a Super Admin as a support team member.");
      }

      // Step 1: Add to support team roster
      let result;
      const { data, error } = await supabase
        .from("support_team_members")
        .insert({
          user_id: user.id,
          added_by: currentUser.id,
          label: input.label || null,
          notes: input.notes || null,
          status: "active",
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          const { data: updated, error: updateErr } = await supabase
            .from("support_team_members")
            .update({
              status: "active",
              label: input.label || null,
              notes: input.notes || null,
              added_by: currentUser.id,
            })
            .eq("user_id", user.id)
            .select()
            .single();
          if (updateErr) throw updateErr;
          result = updated;
        } else {
          throw error;
        }
      } else {
        result = data;
      }

      // Step 2: Promote to support_ops so they can access the Support shell
      await setUserRole(user.id, "support_ops");

      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support-team"] });
    },
  });
}

export function useUpdateSupportMember() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      user_id: string;
      status?: SupportTeamStatus;
      label?: string | null;
      notes?: string | null;
    }) => {
      const { id, user_id, ...updates } = input;
      const { data, error } = await supabase
        .from("support_team_members")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Sync platform_role with support team status
      if (updates.status === "active") {
        await setUserRole(user_id, "support_ops");
      } else if (updates.status === "inactive" || updates.status === "removed") {
        await setUserRole(user_id, "tenant_user");
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support-team"] });
    },
  });
}

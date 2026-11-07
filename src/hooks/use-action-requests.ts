import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { SupportActionRequest, ActionRequestStatus } from "@/types";

export interface ActionRequestWithDetails extends SupportActionRequest {
  requester: { full_name: string; email: string };
  reviewer: { full_name: string; email: string } | null;
  tenant: { name: string };
  grant: { permission_key: string } | null;
}

export function useActionRequests() {
  return useQuery({
    queryKey: ["action-requests"],
    queryFn: async (): Promise<ActionRequestWithDetails[]> => {
      const { data, error } = await supabase
        .from("support_action_requests")
        .select(
          "*, requester:platform_users!requester_id(full_name, email), reviewer:platform_users!reviewer_id(full_name, email), tenant:tenants!tenant_id(name), grant:support_permission_grants!grant_id(permission_key)"
        )
        .order("requested_at", { ascending: false });

      if (error) throw error;
      return data as ActionRequestWithDetails[];
    },
  });
}

export interface SubmitActionInput {
  permission_key: string;
  tenant_id: string;
  action: string;
  reason: string;
  payload?: Record<string, unknown>;
}

export function useSubmitAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitActionInput) => {
      const { data, error } = await supabase.functions.invoke("support-action", {
        body: {
          permission_key: input.permission_key,
          tenant_id: input.tenant_id,
          action: input.action,
          reason: input.reason,
          payload: input.payload,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-requests"] });
    },
  });
}

export function useReviewActionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      status,
      reason,
    }: {
      requestId: string;
      status: Extract<ActionRequestStatus, "approved" | "rejected">;
      reason: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("review-action", {
        body: {
          request_id: requestId,
          decision: status,
          reason,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-requests"] });
    },
  });
}

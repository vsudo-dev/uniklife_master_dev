export type GrantStatus = "active" | "expired" | "revoked";

export type ActionRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired";

export interface SupportPermissionGrant {
  id: string;
  grantee_user_id: string;
  granted_by_user_id: string;
  permission_key: string;
  tenant_scope_id: string | null;
  module_scope_id: string | null;
  allowed_actions: string[];
  requires_approval: boolean;
  effective_at: string;
  expires_at: string;
  reason: string;
  status: GrantStatus;
  revoked_at: string | null;
  revoked_by: string | null;
  revoked_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type SupportTeamStatus = "active" | "inactive" | "removed";

export interface SupportTeamMember {
  id: string;
  user_id: string;
  added_by: string;
  label: string | null;
  status: SupportTeamStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportActionRequest {
  id: string;
  requester_id: string;
  grant_id: string;
  tenant_id: string;
  module_id: string | null;
  requested_action: string;
  request_reason: string;
  payload: Record<string, unknown> | null;
  status: ActionRequestStatus;
  reviewer_id: string | null;
  review_reason: string | null;
  requested_at: string;
  reviewed_at: string | null;
  expires_at: string;
  executed_at: string | null;
}

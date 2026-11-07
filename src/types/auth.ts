export type PlatformRole = "super_admin" | "support_ops" | "tenant_user";

export type TenantRole =
  | "tenant_admin"
  | "practitioner"
  | "staff"
  | "customer";

export type UserStatus = "active" | "suspended" | "deactivated";

export type MembershipStatus = "invited" | "active" | "suspended" | "removed";

export interface PlatformUser {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  platform_role: PlatformRole;
  status: UserStatus;
  mfa_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantMembership {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  status: MembershipStatus;
  invited_by: string | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: PlatformUser | null;
  memberships: TenantMembership[];
  activeTenantId: string | null;
  activeTenantSlug: string | null;
  activeRole: TenantRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

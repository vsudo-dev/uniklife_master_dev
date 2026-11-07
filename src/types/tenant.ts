export type TenantStatus = "pending" | "active" | "suspended" | "deactivated";

export type SubscriptionTier =
  | "free"
  | "starter"
  | "professional"
  | "enterprise";

export type BranchStatus = "active" | "suspended" | "closed";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  subscription_tier: SubscriptionTier;
  primary_industry_id: string | null;
  crm_location_id: string | null;
  crm_contact_tag: string | null;
  crm_tag_strict_mode: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  timezone: string;
  is_primary: boolean;
  status: BranchStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BranchAssignment {
  id: string;
  membership_id: string;
  branch_id: string;
  assigned_by: string | null;
  assigned_at: string;
  removed_at: string | null;
}

export interface TenantBranding {
  id: string;
  tenant_id: string;
  business_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  sidebar_gradient_from: string | null;
  sidebar_gradient_to: string | null;
  font_family: string;
  custom_domain: string | null;
  subdomain: string | null;
  email_sender_name: string | null;
  email_sender_address: string | null;
  support_email: string | null;
  privacy_notice_url: string | null;
  light_theme: Record<string, unknown>;
  dark_theme: Record<string, unknown>;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

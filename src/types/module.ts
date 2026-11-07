export type ModuleLayer = "platform" | "core" | "vertical" | "addon";
export type ModuleLifecycle = "draft" | "beta" | "stable" | "deprecated" | "removed";
export type EntitlementStatus = "pending" | "active" | "suspended" | "disabled" | "expired";
export type IndustryStatus = "active" | "draft" | "deprecated";

export interface IndustryProfile {
  id: string;
  key: string;
  name: string;
  description: string | null;
  default_roles: string[];
  nav_config: Record<string, unknown>;
  dashboard_config: Record<string, unknown>;
  vocabulary_defaults: Record<string, unknown>;
  status: IndustryStatus;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface ModuleDependency {
  module_key: string;
  type: "required" | "optional" | "recommended";
  min_version: string;
}

export interface GlobalModule {
  id: string;
  key: string;
  display_name: string;
  description: string | null;
  layer: ModuleLayer;
  industry_keys: string[];
  version: string;
  lifecycle_status: ModuleLifecycle;
  dependencies: ModuleDependency[];
  nav_config: Record<string, unknown>;
  permission_declarations: Record<string, unknown>;
  feature_flags: Record<string, unknown>;
  quota_schema: Record<string, unknown>;
  config_schema: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TenantEntitlement {
  id: string;
  tenant_id: string;
  module_id: string;
  status: EntitlementStatus;
  assigned_by: string;
  approved_by: string | null;
  effective_date: string;
  expiry_date: string | null;
  trial_end_date: string | null;
  usage_quotas: Record<string, unknown>;
  feature_config: Record<string, unknown>;
  contract_ref: string | null;
  change_reason: string | null;
  created_at: string;
  updated_at: string;
  // joined
  global_modules?: GlobalModule;
}

export interface TenantFeatureSetting {
  id: string;
  tenant_id: string;
  module_id: string;
  feature_key: string;
  enabled: boolean;
  config_value: unknown;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TagDefinition {
  id: string;
  namespace: string;
  name: string;
  description: string | null;
  color: string | null;
  allowed_entity_types: string[];
  owner_type: "platform" | "tenant";
  owner_id: string | null;
  status: "active" | "archived";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EntityTag {
  id: string;
  tag_id: string;
  entity_type: string;
  entity_id: string;
  tenant_id: string;
  tagged_by: string | null;
  created_at: string;
}

export interface TenantVocabulary {
  id: string;
  tenant_id: string;
  industry_id: string | null;
  term_key: string;
  default_label: string;
  custom_label: string | null;
  language: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

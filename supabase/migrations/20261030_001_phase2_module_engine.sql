-- Phase 2: Module Engine — Industry Registry, Module Registry, Entitlement Engine,
-- Tags, Vocabulary, Feature Flags
-- Date: 2026-10-29

-- ============================================================
-- 1. INDUSTRY PROFILES
-- ============================================================

CREATE TABLE industry_profiles (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key                  TEXT NOT NULL UNIQUE,
  name                 TEXT NOT NULL,
  description          TEXT,
  default_roles        TEXT[] NOT NULL DEFAULT '{}',
  nav_config           JSONB NOT NULL DEFAULT '{}',
  dashboard_config     JSONB NOT NULL DEFAULT '{}',
  vocabulary_defaults  JSONB NOT NULL DEFAULT '{}',
  status               TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'draft', 'deprecated')),
  version              TEXT NOT NULL DEFAULT '1.0.0',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_industry_profiles_updated_at
  BEFORE UPDATE ON industry_profiles
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- FK from tenants.primary_industry_id → industry_profiles
ALTER TABLE tenants
  ADD CONSTRAINT fk_tenants_industry
  FOREIGN KEY (primary_industry_id) REFERENCES industry_profiles(id);

-- ============================================================
-- 2. TENANT INDUSTRIES (many-to-many)
-- ============================================================

CREATE TABLE tenant_industries (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  industry_id UUID NOT NULL REFERENCES industry_profiles(id),
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, industry_id)
);

CREATE INDEX idx_tenant_industries_tenant ON tenant_industries(tenant_id);

-- ============================================================
-- 3. GLOBAL MODULES
-- ============================================================

CREATE TABLE global_modules (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key                     TEXT NOT NULL UNIQUE,
  display_name            TEXT NOT NULL,
  description             TEXT,
  layer                   TEXT NOT NULL
    CHECK (layer IN ('platform', 'core', 'vertical', 'addon')),
  industry_keys           TEXT[] NOT NULL DEFAULT '{}',
  version                 TEXT NOT NULL DEFAULT '1.0.0',
  lifecycle_status        TEXT NOT NULL DEFAULT 'draft'
    CHECK (lifecycle_status IN ('draft', 'beta', 'stable', 'deprecated', 'removed')),
  dependencies            JSONB NOT NULL DEFAULT '[]',
  nav_config              JSONB NOT NULL DEFAULT '{}',
  permission_declarations JSONB NOT NULL DEFAULT '{}',
  feature_flags           JSONB NOT NULL DEFAULT '{}',
  quota_schema            JSONB NOT NULL DEFAULT '{}',
  config_schema           JSONB NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_global_modules_updated_at
  BEFORE UPDATE ON global_modules
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================
-- 4. TENANT ENTITLEMENTS (state machine)
-- ============================================================

CREATE TABLE tenant_entitlements (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module_id       UUID NOT NULL REFERENCES global_modules(id),
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'suspended', 'disabled', 'expired')),
  assigned_by     UUID NOT NULL REFERENCES platform_users(id),
  approved_by     UUID REFERENCES platform_users(id),
  effective_date  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiry_date     TIMESTAMPTZ,
  trial_end_date  TIMESTAMPTZ,
  usage_quotas    JSONB NOT NULL DEFAULT '{}',
  feature_config  JSONB NOT NULL DEFAULT '{}',
  contract_ref    TEXT,
  change_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, module_id)
);

CREATE INDEX idx_entitlements_tenant ON tenant_entitlements(tenant_id);
CREATE INDEX idx_entitlements_status ON tenant_entitlements(tenant_id, status);

CREATE TRIGGER set_entitlements_updated_at
  BEFORE UPDATE ON tenant_entitlements
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================
-- 5. TENANT FEATURE SETTINGS
-- ============================================================

CREATE TABLE tenant_feature_settings (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module_id     UUID NOT NULL REFERENCES global_modules(id),
  feature_key   TEXT NOT NULL,
  enabled       BOOLEAN NOT NULL DEFAULT true,
  config_value  JSONB,
  updated_by    UUID REFERENCES platform_users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, module_id, feature_key)
);

CREATE TRIGGER set_feature_settings_updated_at
  BEFORE UPDATE ON tenant_feature_settings
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================
-- 6. TAG DEFINITIONS
-- ============================================================

CREATE TABLE tag_definitions (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  namespace           TEXT NOT NULL,
  name                TEXT NOT NULL,
  description         TEXT,
  color               TEXT,
  allowed_entity_types TEXT[] NOT NULL DEFAULT '{}',
  owner_type          TEXT NOT NULL CHECK (owner_type IN ('platform', 'tenant')),
  owner_id            UUID,
  status              TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_by          UUID REFERENCES platform_users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (namespace, name, owner_id)
);

CREATE TRIGGER set_tag_definitions_updated_at
  BEFORE UPDATE ON tag_definitions
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================
-- 7. ENTITY TAGS (polymorphic tagging)
-- ============================================================

CREATE TABLE entity_tags (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_id      UUID NOT NULL REFERENCES tag_definitions(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  tagged_by   UUID REFERENCES platform_users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tag_id, entity_type, entity_id)
);

CREATE INDEX idx_entity_tags_entity ON entity_tags(entity_type, entity_id);
CREATE INDEX idx_entity_tags_tenant ON entity_tags(tenant_id);

-- ============================================================
-- 8. TENANT VOCABULARY
-- ============================================================

CREATE TABLE tenant_vocabulary (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  industry_id   UUID REFERENCES industry_profiles(id),
  term_key      TEXT NOT NULL,
  default_label TEXT NOT NULL,
  custom_label  TEXT,
  language      TEXT NOT NULL DEFAULT 'en',
  updated_by    UUID REFERENCES platform_users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, term_key, language)
);

CREATE TRIGGER set_vocabulary_updated_at
  BEFORE UPDATE ON tenant_vocabulary
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================
-- 9. ENTITLEMENT HELPER FUNCTIONS
-- ============================================================

-- Check if a tenant has an active entitlement for a module
CREATE OR REPLACE FUNCTION public.tenant_has_module(p_tenant_id UUID, p_module_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tenant_entitlements te
    JOIN global_modules gm ON gm.id = te.module_id
    WHERE te.tenant_id = p_tenant_id
      AND gm.key = p_module_key
      AND te.status = 'active'
      AND (te.expiry_date IS NULL OR te.expiry_date > now())
  );
$$;

-- Validate all required dependencies are active before enabling a module
CREATE OR REPLACE FUNCTION public.validate_module_dependencies(
  p_tenant_id UUID,
  p_module_id UUID
)
RETURNS TABLE(missing_key TEXT, missing_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH deps AS (
    SELECT
      (dep->>'module_key') AS dep_key,
      (dep->>'type') AS dep_type
    FROM global_modules gm,
         jsonb_array_elements(gm.dependencies) AS dep
    WHERE gm.id = p_module_id
  )
  SELECT d.dep_key, gm2.display_name
  FROM deps d
  JOIN global_modules gm2 ON gm2.key = d.dep_key
  WHERE d.dep_type = 'required'
    AND NOT public.tenant_has_module(p_tenant_id, d.dep_key);
$$;

-- Check if disabling a module would break other active modules
CREATE OR REPLACE FUNCTION public.check_module_dependents(
  p_tenant_id UUID,
  p_module_key TEXT
)
RETURNS TABLE(dependent_key TEXT, dependent_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT gm.key, gm.display_name
  FROM tenant_entitlements te
  JOIN global_modules gm ON gm.id = te.module_id
  WHERE te.tenant_id = p_tenant_id
    AND te.status = 'active'
    AND gm.dependencies @> jsonb_build_array(
          jsonb_build_object('module_key', p_module_key, 'type', 'required')
        );
$$;

-- Entitlement state transition function
CREATE OR REPLACE FUNCTION public.transition_entitlement(
  p_entitlement_id UUID,
  p_new_status TEXT,
  p_actor_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS tenant_entitlements
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_ent tenant_entitlements;
  v_old_status TEXT;
  v_valid_transitions JSONB := '{
    "pending":   ["active", "disabled"],
    "active":    ["suspended", "disabled"],
    "suspended": ["active", "disabled"],
    "disabled":  ["pending"],
    "expired":   ["pending"]
  }'::jsonb;
BEGIN
  SELECT * INTO v_ent FROM tenant_entitlements WHERE id = p_entitlement_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entitlement % not found', p_entitlement_id;
  END IF;

  v_old_status := v_ent.status;

  IF NOT (v_valid_transitions->v_old_status) ? p_new_status THEN
    RAISE EXCEPTION 'Invalid transition: % → %', v_old_status, p_new_status;
  END IF;

  -- If activating, validate dependencies
  IF p_new_status = 'active' THEN
    IF EXISTS (
      SELECT 1 FROM public.validate_module_dependencies(v_ent.tenant_id, v_ent.module_id)
    ) THEN
      RAISE EXCEPTION 'Cannot activate: missing required dependencies';
    END IF;
    UPDATE tenant_entitlements
    SET status = 'active',
        approved_by = p_actor_id,
        change_reason = COALESCE(p_reason, change_reason),
        updated_at = now()
    WHERE id = p_entitlement_id
    RETURNING * INTO v_ent;
  ELSE
    -- If disabling, check dependents
    IF p_new_status = 'disabled' AND v_old_status = 'active' THEN
      DECLARE
        v_module_key TEXT;
      BEGIN
        SELECT gm.key INTO v_module_key
        FROM global_modules gm WHERE gm.id = v_ent.module_id;

        IF EXISTS (
          SELECT 1 FROM public.check_module_dependents(v_ent.tenant_id, v_module_key)
        ) THEN
          RAISE EXCEPTION 'Cannot disable: other active modules depend on this one';
        END IF;
      END;
    END IF;

    UPDATE tenant_entitlements
    SET status = p_new_status,
        change_reason = COALESCE(p_reason, change_reason),
        updated_at = now()
    WHERE id = p_entitlement_id
    RETURNING * INTO v_ent;
  END IF;

  -- Audit
  INSERT INTO audit_logs (actor_id, actor_role, tenant_id, action, entity_type, entity_id, details)
  VALUES (
    p_actor_id,
    (SELECT platform_role FROM platform_users WHERE id = p_actor_id),
    v_ent.tenant_id,
    'ENTITLEMENT_' || upper(p_new_status),
    'tenant_entitlements',
    v_ent.id,
    jsonb_build_object(
      'old_status', v_old_status,
      'new_status', p_new_status,
      'reason', p_reason,
      'module_id', v_ent.module_id
    )
  );

  RETURN v_ent;
END;
$$;

-- ============================================================
-- 10. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE industry_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_feature_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_vocabulary ENABLE ROW LEVEL SECURITY;

-- INDUSTRY PROFILES: readable by all authenticated, writable by super_admin
CREATE POLICY "industry_profiles_select" ON industry_profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "industry_profiles_insert" ON industry_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "industry_profiles_update" ON industry_profiles
  FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "industry_profiles_delete" ON industry_profiles
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- TENANT INDUSTRIES: readable by tenant members, writable by super_admin or tenant_admin
CREATE POLICY "tenant_industries_select" ON tenant_industries
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR tenant_id IN (SELECT public.active_tenant_ids())
  );

CREATE POLICY "tenant_industries_insert" ON tenant_industries
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR public.tenant_role(tenant_id) = 'tenant_admin'
  );

CREATE POLICY "tenant_industries_delete" ON tenant_industries
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR public.tenant_role(tenant_id) = 'tenant_admin'
  );

-- GLOBAL MODULES: readable by all authenticated, writable by super_admin
CREATE POLICY "global_modules_select" ON global_modules
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "global_modules_insert" ON global_modules
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "global_modules_update" ON global_modules
  FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "global_modules_delete" ON global_modules
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- TENANT ENTITLEMENTS: readable by tenant members, writable by super_admin
CREATE POLICY "tenant_entitlements_select" ON tenant_entitlements
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR tenant_id IN (SELECT public.active_tenant_ids())
  );

CREATE POLICY "tenant_entitlements_insert" ON tenant_entitlements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "tenant_entitlements_update" ON tenant_entitlements
  FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "tenant_entitlements_delete" ON tenant_entitlements
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- TENANT FEATURE SETTINGS: readable by tenant members, writable by super_admin or tenant_admin
CREATE POLICY "feature_settings_select" ON tenant_feature_settings
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR tenant_id IN (SELECT public.active_tenant_ids())
  );

CREATE POLICY "feature_settings_insert" ON tenant_feature_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR public.tenant_role(tenant_id) = 'tenant_admin'
  );

CREATE POLICY "feature_settings_update" ON tenant_feature_settings
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR public.tenant_role(tenant_id) = 'tenant_admin'
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.tenant_role(tenant_id) = 'tenant_admin'
  );

CREATE POLICY "feature_settings_delete" ON tenant_feature_settings
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- TAG DEFINITIONS: platform tags visible to all, tenant tags visible to tenant members
CREATE POLICY "tag_definitions_select" ON tag_definitions
  FOR SELECT TO authenticated
  USING (
    owner_type = 'platform'
    OR public.is_super_admin()
    OR (owner_type = 'tenant' AND owner_id IN (SELECT public.active_tenant_ids()))
  );

CREATE POLICY "tag_definitions_insert" ON tag_definitions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (owner_type = 'tenant' AND public.tenant_role(owner_id) = 'tenant_admin')
  );

CREATE POLICY "tag_definitions_update" ON tag_definitions
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (owner_type = 'tenant' AND public.tenant_role(owner_id) = 'tenant_admin')
  )
  WITH CHECK (
    public.is_super_admin()
    OR (owner_type = 'tenant' AND public.tenant_role(owner_id) = 'tenant_admin')
  );

CREATE POLICY "tag_definitions_delete" ON tag_definitions
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (owner_type = 'tenant' AND public.tenant_role(owner_id) = 'tenant_admin')
  );

-- ENTITY TAGS: tenant-scoped
CREATE POLICY "entity_tags_select" ON entity_tags
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR tenant_id IN (SELECT public.active_tenant_ids())
  );

CREATE POLICY "entity_tags_insert" ON entity_tags
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR tenant_id IN (SELECT public.active_tenant_ids())
  );

CREATE POLICY "entity_tags_delete" ON entity_tags
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR tenant_id IN (SELECT public.active_tenant_ids())
  );

-- TENANT VOCABULARY: readable by tenant members, writable by tenant_admin or super_admin
CREATE POLICY "vocabulary_select" ON tenant_vocabulary
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR tenant_id IN (SELECT public.active_tenant_ids())
  );

CREATE POLICY "vocabulary_insert" ON tenant_vocabulary
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR public.tenant_role(tenant_id) = 'tenant_admin'
  );

CREATE POLICY "vocabulary_update" ON tenant_vocabulary
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR public.tenant_role(tenant_id) = 'tenant_admin'
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.tenant_role(tenant_id) = 'tenant_admin'
  );

CREATE POLICY "vocabulary_delete" ON tenant_vocabulary
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR public.tenant_role(tenant_id) = 'tenant_admin'
  );

-- ============================================================
-- 11. AUDIT TRIGGERS on new tables
-- ============================================================

CREATE TRIGGER audit_entitlements
  AFTER INSERT OR UPDATE OR DELETE ON tenant_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_global_modules
  AFTER INSERT OR UPDATE OR DELETE ON global_modules
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_industry_profiles
  AFTER INSERT OR UPDATE OR DELETE ON industry_profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_feature_settings
  AFTER INSERT OR UPDATE OR DELETE ON tenant_feature_settings
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============================================================
-- 12. SEED: Initial Industry Profiles
-- ============================================================

INSERT INTO industry_profiles (key, name, description, default_roles, status) VALUES
  ('HEALTH_WELLNESS', 'Health & Wellness', 'Weight loss clinics, nutrition centers, wellness coaches', ARRAY['practitioner', 'staff', 'customer'], 'active'),
  ('REAL_ESTATE', 'Real Estate', 'Property management, brokerage, real estate agencies', ARRAY['agent', 'staff', 'customer'], 'draft'),
  ('EDUCATION', 'Education & Training', 'Schools, coaching centers, online academies', ARRAY['instructor', 'staff', 'student'], 'draft'),
  ('HOSPITALITY', 'Hospitality & F&B', 'Hotels, restaurants, catering, event management', ARRAY['manager', 'staff', 'customer'], 'draft'),
  ('PROFESSIONAL_SERVICES', 'Professional Services', 'Legal, accounting, consulting firms', ARRAY['consultant', 'staff', 'client'], 'draft');

-- ============================================================
-- 13. SEED: Initial Module Registry (56 modules per architecture)
-- ============================================================

-- Platform modules (P01-P11)
INSERT INTO global_modules (key, display_name, description, layer, industry_keys, lifecycle_status, dependencies) VALUES
  ('P01', 'Identity & Auth', 'User identity, authentication, session management', 'platform', '{}', 'stable', '[]'),
  ('P02', 'Tenant Management', 'Create, configure, suspend tenants', 'platform', '{}', 'stable', '[{"module_key":"P01","type":"required","min_version":"1.0.0"}]'),
  ('P03', 'Branch Management', 'Multi-location branch operations', 'platform', '{}', 'stable', '[{"module_key":"P02","type":"required","min_version":"1.0.0"}]'),
  ('P04', 'Membership & Roles', 'User-tenant membership, role assignment', 'platform', '{}', 'stable', '[{"module_key":"P01","type":"required","min_version":"1.0.0"},{"module_key":"P02","type":"required","min_version":"1.0.0"}]'),
  ('P05', 'Support Delegation', 'Scoped permission grants with approval workflows', 'platform', '{}', 'stable', '[{"module_key":"P04","type":"required","min_version":"1.0.0"}]'),
  ('P06', 'Entitlement Engine', 'Module entitlements, state machine, dependency checks', 'platform', '{}', 'stable', '[{"module_key":"P02","type":"required","min_version":"1.0.0"}]'),
  ('P07', 'Audit & Logging', 'Audit trail, privileged operation log', 'platform', '{}', 'stable', '[{"module_key":"P01","type":"required","min_version":"1.0.0"}]'),
  ('P08', 'White-Label Engine', 'Branding, theming, custom domains', 'platform', '{}', 'draft', '[{"module_key":"P02","type":"required","min_version":"1.0.0"}]'),
  ('P09', 'Industry Registry', 'Industry profiles, vertical configuration', 'platform', '{}', 'stable', '[]'),
  ('P10', 'Feature Flags & Quotas', 'Per-tenant feature toggles and usage limits', 'platform', '{}', 'stable', '[{"module_key":"P06","type":"required","min_version":"1.0.0"}]'),
  ('P11', 'Platform Billing', 'Subscription management, invoicing', 'platform', '{}', 'draft', '[{"module_key":"P02","type":"required","min_version":"1.0.0"}]');

-- Core modules (C01-C11)
INSERT INTO global_modules (key, display_name, description, layer, industry_keys, lifecycle_status, dependencies) VALUES
  ('C01', 'Contacts & CRM', 'Contact management, leads, communication', 'core', '{}', 'draft', '[{"module_key":"P04","type":"required","min_version":"1.0.0"}]'),
  ('C02', 'Appointments & Scheduling', 'Service catalog, availability, bookings', 'core', '{}', 'draft', '[{"module_key":"C01","type":"required","min_version":"1.0.0"}]'),
  ('C03', 'Documents & Files', 'Document management, file storage, templates', 'core', '{}', 'draft', '[{"module_key":"P04","type":"required","min_version":"1.0.0"}]'),
  ('C04', 'Finance Core', 'Invoicing, payments, ledger', 'core', '{}', 'draft', '[{"module_key":"P04","type":"required","min_version":"1.0.0"}]'),
  ('C05', 'Notifications Engine', 'Email, SMS, push notifications', 'core', '{}', 'draft', '[{"module_key":"P01","type":"required","min_version":"1.0.0"}]'),
  ('C06', 'Reports & Analytics', 'Dashboards, report builder, exports', 'core', '{}', 'draft', '[{"module_key":"P04","type":"required","min_version":"1.0.0"}]'),
  ('C07', 'Staff Management', 'Schedules, attendance, performance', 'core', '{}', 'draft', '[{"module_key":"P04","type":"required","min_version":"1.0.0"},{"module_key":"P03","type":"optional","min_version":"1.0.0"}]'),
  ('C08', 'Communication Hub', 'Chat, messaging, announcements', 'core', '{}', 'draft', '[{"module_key":"P04","type":"required","min_version":"1.0.0"}]'),
  ('C09', 'Workflow Engine', 'Event triggers, automation rules', 'core', '{}', 'draft', '[{"module_key":"P01","type":"required","min_version":"1.0.0"}]'),
  ('C10', 'Tags & Metadata', 'Tagging system, custom fields', 'core', '{}', 'stable', '[{"module_key":"P04","type":"required","min_version":"1.0.0"}]'),
  ('C11', 'Dynamic Vocabulary', 'Customizable labels per tenant/industry', 'core', '{}', 'stable', '[{"module_key":"P09","type":"optional","min_version":"1.0.0"}]');

-- Wellness vertical modules (W01-W24)
INSERT INTO global_modules (key, display_name, description, layer, industry_keys, lifecycle_status, dependencies) VALUES
  ('W01', 'Wellness Client Identity', 'Client profiles, wellness-specific fields', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"C01","type":"required","min_version":"1.0.0"}]'),
  ('W02', 'Coach Assignments', 'Practitioner-client assignment and management', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"W01","type":"required","min_version":"1.0.0"}]'),
  ('W03', 'Health Assessment', 'Intake forms, medical history, screening', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"W01","type":"required","min_version":"1.0.0"}]'),
  ('W04', 'Weight & Body Progress', 'Measurements, BMI, trends, charts', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"W01","type":"required","min_version":"1.0.0"},{"module_key":"W03","type":"optional","min_version":"1.0.0"}]'),
  ('W05', 'Goals & Care Plans', 'Goal setting, versioned care plans, approval', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"W01","type":"required","min_version":"1.0.0"},{"module_key":"W03","type":"optional","min_version":"1.0.0"}]'),
  ('W06', 'Nutrition & Meal Plans', 'Food database, recipes, meal planning', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"W01","type":"required","min_version":"1.0.0"}]'),
  ('W07', 'Food Diary', 'Client food logging and tracking', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"W06","type":"required","min_version":"1.0.0"}]'),
  ('W08', 'Fitness & Activity', 'Exercise plans, activity tracking', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"W01","type":"required","min_version":"1.0.0"}]'),
  ('W09', 'Habits & Lifestyle', 'Sleep, water, habit tracking', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"W01","type":"required","min_version":"1.0.0"}]'),
  ('W10', 'Wellness Programs', 'Program creation, enrollment, session credits', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"W01","type":"required","min_version":"1.0.0"},{"module_key":"C02","type":"optional","min_version":"1.0.0"}]'),
  ('W11', 'Progress Reviews', 'Periodic review sessions, progress reports', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"W01","type":"required","min_version":"1.0.0"},{"module_key":"W04","type":"optional","min_version":"1.0.0"}]'),
  ('W12', 'Practitioner Workspace', 'Dashboard, daily schedule, client queue', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"W02","type":"required","min_version":"1.0.0"},{"module_key":"C02","type":"optional","min_version":"1.0.0"}]'),
  ('W13', 'Client Portal', 'PWA for clients: appointments, progress, diary', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"W01","type":"required","min_version":"1.0.0"}]'),
  ('W14', 'Allergies & Medications', 'Allergy tracking, medication management', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"W03","type":"required","min_version":"1.0.0"}]'),
  ('W15', 'Lab Results', 'Lab report upload and tracking', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"W03","type":"required","min_version":"1.0.0"}]'),
  ('W16', 'Supplement Management', 'Supplement recommendations and tracking', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"W01","type":"required","min_version":"1.0.0"}]'),
  ('W17', 'Before/After Gallery', 'Progress photos with consent management', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"W04","type":"required","min_version":"1.0.0"},{"module_key":"C03","type":"required","min_version":"1.0.0"}]'),
  ('W18', 'Wellness Reports', 'Client progress reports, trend analysis', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"C06","type":"required","min_version":"1.0.0"},{"module_key":"W04","type":"optional","min_version":"1.0.0"}]'),
  ('W19', 'Reminders & Follow-ups', 'Appointment reminders, check-in messages', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"C05","type":"required","min_version":"1.0.0"},{"module_key":"C02","type":"optional","min_version":"1.0.0"}]'),
  ('W20', 'Wellness Billing', 'Session billing, package pricing', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"C04","type":"required","min_version":"1.0.0"},{"module_key":"W10","type":"optional","min_version":"1.0.0"}]'),
  ('W21', 'Multi-Branch Wellness', 'Cross-branch client transfers, shared programs', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"P03","type":"required","min_version":"1.0.0"},{"module_key":"W01","type":"required","min_version":"1.0.0"}]'),
  ('W22', 'Consent Management', 'Health data consent, HIPAA/DPDP compliance', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"W01","type":"required","min_version":"1.0.0"},{"module_key":"C03","type":"optional","min_version":"1.0.0"}]'),
  ('W23', 'AI Wellness Assistant', 'AI-powered recommendations with clinical guardrails', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"W01","type":"required","min_version":"1.0.0"},{"module_key":"W03","type":"optional","min_version":"1.0.0"}]'),
  ('W24', 'Settings & Integrations', 'Wellness-specific settings, device integrations', 'vertical', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"W01","type":"required","min_version":"1.0.0"}]');

-- Add-on modules (WX01-WX10)
INSERT INTO global_modules (key, display_name, description, layer, industry_keys, lifecycle_status, dependencies) VALUES
  ('WX01', 'Home Visits', 'Home visit scheduling, route planning', 'addon', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"C02","type":"required","min_version":"1.0.0"},{"module_key":"W02","type":"required","min_version":"1.0.0"}]'),
  ('WX02', 'Partner Network', 'Referral partners, external practitioners', 'addon', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"C01","type":"required","min_version":"1.0.0"}]'),
  ('WX03', 'Commissions', 'Sales commission tracking, payouts', 'addon', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"C04","type":"required","min_version":"1.0.0"}]'),
  ('WX04', 'Device Sync', 'Wearable device data integration', 'addon', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"W04","type":"required","min_version":"1.0.0"}]'),
  ('WX05', 'Video Consults', 'Telehealth video sessions', 'addon', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"C02","type":"required","min_version":"1.0.0"},{"module_key":"W02","type":"required","min_version":"1.0.0"}]'),
  ('WX06', 'Group Sessions', 'Group classes, workshops, webinars', 'addon', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"C02","type":"required","min_version":"1.0.0"},{"module_key":"W10","type":"optional","min_version":"1.0.0"}]'),
  ('WX07', 'E-Commerce', 'Product catalog, online store, supplements', 'addon', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"C04","type":"required","min_version":"1.0.0"}]'),
  ('WX08', 'Loyalty & Rewards', 'Points, rewards, referral incentives', 'addon', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"C01","type":"required","min_version":"1.0.0"}]'),
  ('WX09', 'Custom Forms', 'Form builder, survey creation', 'addon', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"C03","type":"required","min_version":"1.0.0"}]'),
  ('WX10', 'API Gateway', 'Third-party API management, webhooks', 'addon', ARRAY['HEALTH_WELLNESS'], 'draft', '[{"module_key":"P01","type":"required","min_version":"1.0.0"}]');

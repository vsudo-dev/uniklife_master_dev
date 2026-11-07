-- ============================================================================
-- UNIKLIFE.AI — Phase 1 Foundation Migration
-- Version: 0.3.0
-- Date: 2026-10-28
-- Description: Platform identity, tenants, branches, memberships, delegation, audit
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS moddatetime;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- PLATFORM USERS
-- ============================================================================

CREATE TABLE platform_users (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id  UUID NOT NULL UNIQUE,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  avatar_url    TEXT,
  phone         TEXT,
  platform_role TEXT NOT NULL DEFAULT 'tenant_user'
    CHECK (platform_role IN ('super_admin', 'support_ops', 'tenant_user')),
  status        TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'deactivated')),
  mfa_enabled   BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_platform_users_auth ON platform_users(auth_user_id);
CREATE INDEX idx_platform_users_email ON platform_users(email);

CREATE TRIGGER set_platform_users_updated_at
  BEFORE UPDATE ON platform_users
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================================
-- TENANTS
-- ============================================================================

CREATE TABLE tenants (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'suspended', 'deactivated')),
  subscription_tier   TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'starter', 'professional', 'enterprise')),
  primary_industry_id UUID,
  created_by          UUID NOT NULL REFERENCES platform_users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

CREATE TRIGGER set_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================================
-- BRANCHES
-- ============================================================================

CREATE TABLE branches (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address     TEXT,
  city        TEXT,
  state       TEXT,
  country     TEXT NOT NULL DEFAULT 'IN',
  phone       TEXT,
  email       TEXT,
  timezone    TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  status      TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'closed')),
  created_by  UUID REFERENCES platform_users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, name)
);

CREATE INDEX idx_branches_tenant ON branches(tenant_id);

CREATE TRIGGER set_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================================
-- TENANT MEMBERSHIPS
-- ============================================================================

CREATE TABLE tenant_memberships (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL
    CHECK (role IN ('tenant_admin', 'practitioner', 'staff', 'customer')),
  status      TEXT NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
  invited_by  UUID REFERENCES platform_users(id),
  joined_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, user_id)
);

CREATE INDEX idx_memberships_tenant ON tenant_memberships(tenant_id);
CREATE INDEX idx_memberships_user ON tenant_memberships(user_id);
CREATE INDEX idx_memberships_user_status ON tenant_memberships(user_id, status);

CREATE TRIGGER set_memberships_updated_at
  BEFORE UPDATE ON tenant_memberships
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================================
-- BRANCH ASSIGNMENTS
-- ============================================================================

CREATE TABLE branch_assignments (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  membership_id UUID NOT NULL REFERENCES tenant_memberships(id) ON DELETE CASCADE,
  branch_id     UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  assigned_by   UUID REFERENCES platform_users(id),
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at    TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_branch_assign_active
  ON branch_assignments(membership_id, branch_id)
  WHERE removed_at IS NULL;

CREATE INDEX idx_branch_assign_membership ON branch_assignments(membership_id);
CREATE INDEX idx_branch_assign_branch ON branch_assignments(branch_id);

-- ============================================================================
-- SUPPORT DELEGATION
-- ============================================================================

CREATE TABLE support_permission_grants (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grantee_user_id    UUID NOT NULL REFERENCES platform_users(id),
  granted_by_user_id UUID NOT NULL REFERENCES platform_users(id),
  permission_key     TEXT NOT NULL,
  tenant_scope_id    UUID REFERENCES tenants(id),
  module_scope_id    UUID,
  allowed_actions    TEXT[] NOT NULL DEFAULT '{}',
  requires_approval  BOOLEAN NOT NULL DEFAULT true,
  effective_at       TIMESTAMPTZ NOT NULL,
  expires_at         TIMESTAMPTZ NOT NULL,
  reason             TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'revoked')),
  revoked_at         TIMESTAMPTZ,
  revoked_by         UUID REFERENCES platform_users(id),
  revoked_reason     TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (grantee_user_id != granted_by_user_id),
  CHECK (expires_at > effective_at)
);

CREATE UNIQUE INDEX idx_support_grants_active
  ON support_permission_grants(grantee_user_id, permission_key, tenant_scope_id, module_scope_id)
  WHERE status = 'active';

CREATE INDEX idx_support_grants_grantee ON support_permission_grants(grantee_user_id);
CREATE INDEX idx_support_grants_status ON support_permission_grants(status, expires_at);

CREATE TRIGGER set_support_grants_updated_at
  BEFORE UPDATE ON support_permission_grants
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================================
-- SUPPORT ACTION REQUESTS (approval queue)
-- ============================================================================

CREATE TABLE support_action_requests (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id     UUID NOT NULL REFERENCES platform_users(id),
  grant_id         UUID NOT NULL REFERENCES support_permission_grants(id),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  module_id        UUID,
  requested_action TEXT NOT NULL,
  request_reason   TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  reviewer_id      UUID REFERENCES platform_users(id),
  review_reason    TEXT,
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at      TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ NOT NULL,
  executed_at      TIMESTAMPTZ,

  CHECK (reviewer_id IS NULL OR reviewer_id != requester_id)
);

CREATE INDEX idx_support_requests_status ON support_action_requests(status);
CREATE INDEX idx_support_requests_requester ON support_action_requests(requester_id);

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

CREATE TABLE audit_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id    UUID REFERENCES platform_users(id),
  actor_role  TEXT,
  tenant_id   UUID REFERENCES tenants(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  details     JSONB NOT NULL DEFAULT '{}',
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- ============================================================================
-- PRIVILEGED OPERATION LOG
-- ============================================================================

CREATE TABLE privileged_operation_log (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id       UUID NOT NULL REFERENCES platform_users(id),
  actor_role     TEXT NOT NULL,
  operation      TEXT NOT NULL,
  tenant_id      UUID REFERENCES tenants(id),
  record_type    TEXT,
  record_id      UUID,
  reason         TEXT NOT NULL,
  legal_ref      TEXT,
  details        JSONB NOT NULL DEFAULT '{}',
  ip_address     INET,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_priv_log_actor ON privileged_operation_log(actor_id, created_at DESC);
CREATE INDEX idx_priv_log_tenant ON privileged_operation_log(tenant_id, created_at DESC);

-- ============================================================================
-- HEALTH DATA ACCESS LOG (for Phase 4, but table created now)
-- ============================================================================

CREATE TABLE health_data_access_log (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES platform_users(id),
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  record_type    TEXT NOT NULL,
  record_id      UUID NOT NULL,
  access_reason  TEXT NOT NULL,
  accessed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_access_user ON health_data_access_log(user_id, accessed_at DESC);
CREATE INDEX idx_health_access_tenant ON health_data_access_log(tenant_id, accessed_at DESC);

-- ============================================================================
-- TENANT BRANDING (white-label)
-- ============================================================================

CREATE TABLE tenant_branding (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id             UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  business_name         TEXT NOT NULL,
  logo_url              TEXT,
  favicon_url           TEXT,
  primary_color         TEXT NOT NULL DEFAULT '#1a237e',
  secondary_color       TEXT NOT NULL DEFAULT '#c9a84c',
  accent_color          TEXT NOT NULL DEFAULT '#f5f5f5',
  sidebar_gradient_from TEXT,
  sidebar_gradient_to   TEXT,
  font_family           TEXT NOT NULL DEFAULT 'Urbanist',
  custom_domain         TEXT UNIQUE,
  subdomain             TEXT UNIQUE,
  email_sender_name     TEXT,
  email_sender_address  TEXT,
  support_email         TEXT,
  privacy_notice_url    TEXT,
  light_theme           JSONB NOT NULL DEFAULT '{}',
  dark_theme            JSONB NOT NULL DEFAULT '{}',
  updated_by            UUID REFERENCES platform_users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_branding_updated_at
  BEFORE UPDATE ON tenant_branding
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================================
-- IDENTITY RESOLUTION FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.platform_user_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM platform_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.active_tenant_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM tenant_memberships
  WHERE user_id = public.platform_user_id()
    AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.tenant_role(p_tenant_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM tenant_memberships
  WHERE user_id = public.platform_user_id()
    AND tenant_id = p_tenant_id
    AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_users
    WHERE id = public.platform_user_id()
      AND platform_role = 'super_admin'
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_branch_access(p_tenant_id uuid, p_branch_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM branch_assignments ba
    JOIN tenant_memberships tm ON tm.id = ba.membership_id
    WHERE tm.user_id = public.platform_user_id()
      AND tm.tenant_id = p_tenant_id
      AND tm.status = 'active'
      AND ba.branch_id = p_branch_id
      AND ba.removed_at IS NULL
  )
  OR public.tenant_role(p_tenant_id) = 'tenant_admin'
  OR public.is_super_admin();
$$;

-- ============================================================================
-- ROW LEVEL SECURITY — Enable on all tables
-- ============================================================================

ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_permission_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_action_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE privileged_operation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_data_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_branding ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES — platform_users
-- ============================================================================

CREATE POLICY "users_select_own" ON platform_users
  FOR SELECT USING (
    id = public.platform_user_id()
    OR public.is_super_admin()
  );

CREATE POLICY "users_update_own" ON platform_users
  FOR UPDATE USING (id = public.platform_user_id());

CREATE POLICY "users_insert_super" ON platform_users
  FOR INSERT WITH CHECK (public.is_super_admin());

-- ============================================================================
-- RLS POLICIES — tenants
-- ============================================================================

CREATE POLICY "tenants_select" ON tenants
  FOR SELECT USING (
    id IN (SELECT public.active_tenant_ids())
    OR public.is_super_admin()
  );

CREATE POLICY "tenants_insert" ON tenants
  FOR INSERT WITH CHECK (public.is_super_admin());

CREATE POLICY "tenants_update" ON tenants
  FOR UPDATE USING (
    public.is_super_admin()
    OR public.tenant_role(id) = 'tenant_admin'
  );

-- ============================================================================
-- RLS POLICIES — branches
-- ============================================================================

CREATE POLICY "branches_select" ON branches
  FOR SELECT USING (
    tenant_id IN (SELECT public.active_tenant_ids())
    OR public.is_super_admin()
  );

CREATE POLICY "branches_insert" ON branches
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR public.tenant_role(tenant_id) = 'tenant_admin'
  );

CREATE POLICY "branches_update" ON branches
  FOR UPDATE USING (
    public.is_super_admin()
    OR public.tenant_role(tenant_id) = 'tenant_admin'
  );

-- ============================================================================
-- RLS POLICIES — tenant_memberships
-- ============================================================================

CREATE POLICY "memberships_select" ON tenant_memberships
  FOR SELECT USING (
    tenant_id IN (SELECT public.active_tenant_ids())
    OR user_id = public.platform_user_id()
    OR public.is_super_admin()
  );

CREATE POLICY "memberships_insert" ON tenant_memberships
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR public.tenant_role(tenant_id) = 'tenant_admin'
  );

CREATE POLICY "memberships_update" ON tenant_memberships
  FOR UPDATE USING (
    public.is_super_admin()
    OR public.tenant_role(tenant_id) = 'tenant_admin'
  );

-- ============================================================================
-- RLS POLICIES — branch_assignments
-- ============================================================================

CREATE POLICY "branch_assign_select" ON branch_assignments
  FOR SELECT USING (
    membership_id IN (
      SELECT id FROM tenant_memberships
      WHERE tenant_id IN (SELECT public.active_tenant_ids())
    )
    OR public.is_super_admin()
  );

CREATE POLICY "branch_assign_insert" ON branch_assignments
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR membership_id IN (
      SELECT id FROM tenant_memberships
      WHERE public.tenant_role(tenant_id) = 'tenant_admin'
    )
  );

-- ============================================================================
-- RLS POLICIES — support_permission_grants
-- ============================================================================

CREATE POLICY "grants_select" ON support_permission_grants
  FOR SELECT USING (
    grantee_user_id = public.platform_user_id()
    OR public.is_super_admin()
  );

CREATE POLICY "grants_insert" ON support_permission_grants
  FOR INSERT WITH CHECK (public.is_super_admin());

CREATE POLICY "grants_update" ON support_permission_grants
  FOR UPDATE USING (public.is_super_admin());

-- ============================================================================
-- RLS POLICIES — support_action_requests
-- ============================================================================

CREATE POLICY "requests_select" ON support_action_requests
  FOR SELECT USING (
    requester_id = public.platform_user_id()
    OR public.is_super_admin()
  );

CREATE POLICY "requests_insert" ON support_action_requests
  FOR INSERT WITH CHECK (
    requester_id = public.platform_user_id()
  );

CREATE POLICY "requests_update" ON support_action_requests
  FOR UPDATE USING (public.is_super_admin());

-- ============================================================================
-- RLS POLICIES — audit_logs
-- ============================================================================

CREATE POLICY "audit_select" ON audit_logs
  FOR SELECT USING (
    public.is_super_admin()
    OR (tenant_id IS NOT NULL AND tenant_id IN (SELECT public.active_tenant_ids())
        AND public.tenant_role(tenant_id) = 'tenant_admin')
  );

CREATE POLICY "audit_insert" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES — privileged_operation_log
-- ============================================================================

CREATE POLICY "priv_log_select" ON privileged_operation_log
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "priv_log_insert" ON privileged_operation_log
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES — health_data_access_log
-- ============================================================================

CREATE POLICY "health_log_select" ON health_data_access_log
  FOR SELECT USING (
    public.is_super_admin()
    OR (tenant_id IN (SELECT public.active_tenant_ids())
        AND public.tenant_role(tenant_id) = 'tenant_admin')
  );

CREATE POLICY "health_log_insert" ON health_data_access_log
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES — tenant_branding
-- ============================================================================

CREATE POLICY "branding_select" ON tenant_branding
  FOR SELECT USING (
    tenant_id IN (SELECT public.active_tenant_ids())
    OR public.is_super_admin()
  );

CREATE POLICY "branding_insert" ON tenant_branding
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR public.tenant_role(tenant_id) = 'tenant_admin'
  );

CREATE POLICY "branding_update" ON tenant_branding
  FOR UPDATE USING (
    public.is_super_admin()
    OR public.tenant_role(tenant_id) = 'tenant_admin'
  );

-- ============================================================================
-- AUTO-CREATE platform_users on signup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO platform_users (auth_user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- AUDIT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (
    public.platform_user_id(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Audit triggers on sensitive tables
CREATE TRIGGER audit_tenants
  AFTER INSERT OR UPDATE OR DELETE ON tenants
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_memberships
  AFTER INSERT OR UPDATE OR DELETE ON tenant_memberships
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_grants
  AFTER INSERT OR UPDATE OR DELETE ON support_permission_grants
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_branch_assignments
  AFTER INSERT OR UPDATE OR DELETE ON branch_assignments
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ============================================================================
-- Super Admin Auto-Promotion
-- Promotes the designated Super Admin email on platform_users insert.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.promote_super_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = 'i.venkatesh.vg@gmail.com' THEN
    NEW.platform_role := 'super_admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_promote_super_admin
  BEFORE INSERT ON platform_users
  FOR EACH ROW EXECUTE FUNCTION public.promote_super_admin();

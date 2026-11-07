# UNIKLIFE.AI — Database Schema (v0.3.0)

**Version:** 0.3.0  
**Date:** 2026-10-28  
**Status:** PROPOSED — Pending owner approval  
**Engine:** Supabase PostgreSQL (PostgREST 14.x)

---

## Conventions

| Convention | Rule |
|---|---|
| Primary key | `id UUID DEFAULT gen_random_uuid() PRIMARY KEY` |
| Timestamps | `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` |
| Tenant scoping | `tenant_id UUID NOT NULL REFERENCES tenants(id)` with RLS |
| Audit columns | `created_by UUID REFERENCES platform_users(id)`, `updated_by UUID REFERENCES platform_users(id)` |
| Soft delete | `deleted_at TIMESTAMPTZ` (NULL = active) |
| Naming | `snake_case` for tables and columns |
| Money | `NUMERIC(12,2)` — never FLOAT. Currency stored separately where multi-currency needed. |
| Arrays | Use only for immutable/config data (tags[], feature_flags[]). Queryable relationships use junction tables. |
| JSONB | Use for truly schema-less data (custom_fields, config). Structured data uses typed columns. |
| Indexes | Every FK column is indexed. Composite indexes on common query patterns. |
| Unique constraints | Tenant-scoped uniqueness uses `UNIQUE(tenant_id, ...)` |
| updated_at trigger | Applied to all tables via `moddatetime` extension |

---

## Domain 1: Platform (Layer 1)

### platform_users

```sql
CREATE TABLE platform_users (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id  UUID NOT NULL UNIQUE,  -- FK to auth.users (Supabase-managed)
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
```

### tenants

```sql
CREATE TABLE tenants (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'suspended', 'deactivated')),
  subscription_tier   TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'starter', 'professional', 'enterprise')),
  primary_industry_id UUID,  -- FK added after industry_profiles created
  created_by          UUID NOT NULL REFERENCES platform_users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);
```

### branches

```sql
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
```

### tenant_memberships

```sql
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

  UNIQUE (tenant_id, user_id)  -- one membership per user per tenant
);

CREATE INDEX idx_memberships_tenant ON tenant_memberships(tenant_id);
CREATE INDEX idx_memberships_user ON tenant_memberships(user_id);
CREATE INDEX idx_memberships_user_status ON tenant_memberships(user_id, status);
```

### branch_assignments

```sql
CREATE TABLE branch_assignments (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  membership_id UUID NOT NULL REFERENCES tenant_memberships(id) ON DELETE CASCADE,
  branch_id     UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  assigned_by   UUID REFERENCES platform_users(id),
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at    TIMESTAMPTZ,

  UNIQUE (membership_id, branch_id) WHERE removed_at IS NULL
);

CREATE INDEX idx_branch_assign_membership ON branch_assignments(membership_id);
CREATE INDEX idx_branch_assign_branch ON branch_assignments(branch_id);
```

### industry_profiles

```sql
CREATE TABLE industry_profiles (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key                  TEXT NOT NULL UNIQUE,  -- e.g. 'HEALTH_WELLNESS', 'REAL_ESTATE'
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

-- Add FK to tenants after this table exists
ALTER TABLE tenants
  ADD CONSTRAINT fk_tenants_industry
  FOREIGN KEY (primary_industry_id) REFERENCES industry_profiles(id);
```

### tenant_industries

```sql
CREATE TABLE tenant_industries (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  industry_id UUID NOT NULL REFERENCES industry_profiles(id),
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, industry_id)
);

CREATE INDEX idx_tenant_industries_tenant ON tenant_industries(tenant_id);
```

### global_modules

```sql
CREATE TABLE global_modules (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key                     TEXT NOT NULL UNIQUE,  -- e.g. 'P01', 'C01', 'W01'
  display_name            TEXT NOT NULL,
  description             TEXT,
  layer                   TEXT NOT NULL
    CHECK (layer IN ('platform', 'core', 'vertical', 'addon')),
  industry_keys           TEXT[] NOT NULL DEFAULT '{}',  -- empty = all industries
  version                 TEXT NOT NULL DEFAULT '1.0.0',
  lifecycle_status        TEXT NOT NULL DEFAULT 'draft'
    CHECK (lifecycle_status IN ('draft', 'beta', 'stable', 'deprecated', 'removed')),
  dependencies            JSONB NOT NULL DEFAULT '[]',
    -- Array of: { "module_key": "C01", "type": "required"|"optional"|"recommended", "min_version": "1.0.0" }
  nav_config              JSONB NOT NULL DEFAULT '{}',
  permission_declarations JSONB NOT NULL DEFAULT '{}',
  feature_flags           JSONB NOT NULL DEFAULT '{}',
  quota_schema            JSONB NOT NULL DEFAULT '{}',
  config_schema           JSONB NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### tenant_entitlements

```sql
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
```

### tenant_feature_settings

```sql
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
```

### support_permission_grants

```sql
CREATE TABLE support_permission_grants (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grantee_user_id   UUID NOT NULL REFERENCES platform_users(id),
  granted_by_user_id UUID NOT NULL REFERENCES platform_users(id),
  permission_key    TEXT NOT NULL,
  tenant_scope_id   UUID REFERENCES tenants(id),
  module_scope_id   UUID REFERENCES global_modules(id),
  allowed_actions   TEXT[] NOT NULL DEFAULT '{}',
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  effective_at      TIMESTAMPTZ NOT NULL,
  expires_at        TIMESTAMPTZ NOT NULL,
  reason            TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'revoked')),
  revoked_at        TIMESTAMPTZ,
  revoked_by        UUID REFERENCES platform_users(id),
  revoked_reason    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (grantee_user_id != granted_by_user_id),
  CHECK (expires_at > effective_at),
  CHECK (expires_at > now())  -- cannot create already-expired grants
);

CREATE UNIQUE INDEX idx_support_grants_active
  ON support_permission_grants(grantee_user_id, permission_key, tenant_scope_id, module_scope_id)
  WHERE status = 'active';

CREATE INDEX idx_support_grants_grantee ON support_permission_grants(grantee_user_id);
CREATE INDEX idx_support_grants_status ON support_permission_grants(status, expires_at);
```

### support_action_requests

```sql
CREATE TABLE support_action_requests (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id     UUID NOT NULL REFERENCES platform_users(id),
  grant_id         UUID NOT NULL REFERENCES support_permission_grants(id),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  module_id        UUID REFERENCES global_modules(id),
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
```

### tenant_branding

```sql
CREATE TABLE tenant_branding (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id             UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  business_name         TEXT NOT NULL,
  logo_url              TEXT,
  favicon_url           TEXT,
  primary_color         TEXT NOT NULL DEFAULT '#1a237e',   -- Deep Royal Blue
  secondary_color       TEXT NOT NULL DEFAULT '#c9a84c',   -- Metallic Gold
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
```

### tag_definitions

```sql
CREATE TABLE tag_definitions (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  namespace           TEXT NOT NULL,  -- 'platform', 'tenant', 'industry'
  name                TEXT NOT NULL,
  description         TEXT,
  color               TEXT,
  allowed_entity_types TEXT[] NOT NULL DEFAULT '{}',
  owner_type          TEXT NOT NULL CHECK (owner_type IN ('platform', 'tenant')),
  owner_id            UUID,  -- tenant_id if owner_type = 'tenant'
  status              TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_by          UUID REFERENCES platform_users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (namespace, name, owner_id)
);
```

### entity_tags

```sql
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
```

### tenant_vocabulary

```sql
CREATE TABLE tenant_vocabulary (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  industry_id   UUID REFERENCES industry_profiles(id),
  term_key      TEXT NOT NULL,   -- stable identifier, e.g. 'patient', 'appointment'
  default_label TEXT NOT NULL,   -- e.g. 'Patient'
  custom_label  TEXT,            -- e.g. 'Client', 'Member'
  language      TEXT NOT NULL DEFAULT 'en',
  updated_by    UUID REFERENCES platform_users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, term_key, language)
);
```

### audit_logs

```sql
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
```

### privileged_operation_log

```sql
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
```

### health_data_access_log

```sql
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
```

### module_entitlement_audit

```sql
CREATE TABLE module_entitlement_audit (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  module_id       UUID NOT NULL REFERENCES global_modules(id),
  action          TEXT NOT NULL,
  previous_status TEXT,
  new_status      TEXT NOT NULL,
  performed_by    UUID NOT NULL REFERENCES platform_users(id),
  grant_id        UUID REFERENCES support_permission_grants(id),
  request_id      UUID REFERENCES support_action_requests(id),
  metadata        JSONB NOT NULL DEFAULT '{}',
  performed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_entitlement_audit_tenant ON module_entitlement_audit(tenant_id, performed_at DESC);
```

---

## Domain 2: Shared Business Core (Layer 2)

### contacts

```sql
CREATE TABLE contacts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  auth_user_id    UUID,  -- nullable: set when contact can log in
  first_name      TEXT NOT NULL,
  last_name       TEXT,
  email           TEXT,
  phone           TEXT,
  date_of_birth   DATE,
  gender          TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  address         TEXT,
  city            TEXT,
  state           TEXT,
  country         TEXT DEFAULT 'IN',
  source          TEXT,  -- 'walk_in', 'referral', 'website', 'campaign', etc.
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'archived')),
  assigned_to     UUID REFERENCES platform_users(id),
  custom_fields   JSONB NOT NULL DEFAULT '{}',
  consent_given_at TIMESTAMPTZ,
  consent_type    TEXT,
  created_by      UUID REFERENCES platform_users(id),
  updated_by      UUID REFERENCES platform_users(id),
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, email) WHERE email IS NOT NULL AND deleted_at IS NULL,
  UNIQUE (tenant_id, auth_user_id) WHERE auth_user_id IS NOT NULL
);

CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX idx_contacts_auth ON contacts(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX idx_contacts_assigned ON contacts(tenant_id, assigned_to);
CREATE INDEX idx_contacts_search ON contacts(tenant_id, first_name, last_name);
```

### leads

```sql
CREATE TABLE leads (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  contact_id      UUID NOT NULL REFERENCES contacts(id),
  pipeline_stage  TEXT NOT NULL DEFAULT 'new'
    CHECK (pipeline_stage IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  source          TEXT,
  assigned_to     UUID REFERENCES platform_users(id),
  follow_up_date  TIMESTAMPTZ,
  conversion_date TIMESTAMPTZ,
  enrollment_id   UUID,  -- FK added after wellness_enrollments exists
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'converted', 'lost', 'archived')),
  created_by      UUID REFERENCES platform_users(id),
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, contact_id) WHERE status = 'open'  -- one open lead per contact
);

CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_leads_stage ON leads(tenant_id, pipeline_stage);
CREATE INDEX idx_leads_assigned ON leads(tenant_id, assigned_to);
```

### lead_activities

```sql
CREATE TABLE lead_activities (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id       UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  activity_type TEXT NOT NULL,  -- 'call', 'email', 'meeting', 'note', 'status_change'
  description   TEXT,
  performed_by  UUID NOT NULL REFERENCES platform_users(id),
  performed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_activities_lead ON lead_activities(lead_id, performed_at DESC);
CREATE INDEX idx_lead_activities_tenant ON lead_activities(tenant_id);
```

### services

```sql
CREATE TABLE services (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  name             TEXT NOT NULL,
  description      TEXT,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  price            NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL DEFAULT 'INR',
  category         TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  branch_id        UUID REFERENCES branches(id),  -- NULL = available at all branches
  created_by       UUID REFERENCES platform_users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, name) WHERE branch_id IS NULL
);

CREATE INDEX idx_services_tenant ON services(tenant_id);
```

### availability_slots

```sql
CREATE TABLE availability_slots (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  staff_user_id UUID NOT NULL REFERENCES platform_users(id),
  service_id    UUID REFERENCES services(id),
  branch_id     UUID NOT NULL REFERENCES branches(id),
  day_of_week   INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sun
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  is_available  BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (end_time > start_time)
);

CREATE INDEX idx_availability_staff ON availability_slots(tenant_id, staff_user_id, day_of_week);
```

### appointments

```sql
CREATE TABLE appointments (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  contact_id          UUID NOT NULL REFERENCES contacts(id),
  service_id          UUID NOT NULL REFERENCES services(id),
  staff_user_id       UUID NOT NULL REFERENCES platform_users(id),
  branch_id           UUID NOT NULL REFERENCES branches(id),
  scheduled_at        TIMESTAMPTZ NOT NULL,
  duration_minutes    INT NOT NULL CHECK (duration_minutes > 0),
  status              TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'no_show', 'cancelled', 'rescheduled')),
  check_in_at         TIMESTAMPTZ,
  cancellation_reason TEXT,
  reminder_sent_at    TIMESTAMPTZ,
  notes               TEXT,
  booking_lock_token  UUID,  -- for optimistic concurrency control
  booking_lock_until  TIMESTAMPTZ,
  created_by          UUID REFERENCES platform_users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX idx_appointments_staff_date ON appointments(staff_user_id, scheduled_at);
CREATE INDEX idx_appointments_contact ON appointments(contact_id, scheduled_at DESC);
CREATE INDEX idx_appointments_slot ON appointments(staff_user_id, scheduled_at, duration_minutes)
  WHERE status NOT IN ('cancelled', 'rescheduled');  -- for overlap checks
```

**Booking concurrency control:** Before creating/updating an appointment, the Edge Function:
1. Acquires a `booking_lock_token` with a short `booking_lock_until` (30 seconds).
2. Checks for overlapping appointments for the same staff+time window using the partial index.
3. If no overlap, creates the appointment and clears the lock.
4. If overlap, rejects with conflict error. Expired locks are ignored.

### staff_profiles

```sql
CREATE TABLE staff_profiles (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  user_id         UUID NOT NULL REFERENCES platform_users(id),
  job_title       TEXT,
  specialization  TEXT,  -- 'dietitian', 'doctor', 'fitness_coach', 'nutritionist'
  branch_id       UUID REFERENCES branches(id),
  hire_date       DATE,
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'on_leave', 'terminated')),
  bio             TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, user_id)
);

CREATE INDEX idx_staff_tenant ON staff_profiles(tenant_id);
```

### invoices

```sql
CREATE TABLE invoices (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  invoice_number  TEXT NOT NULL,
  contact_id      UUID NOT NULL REFERENCES contacts(id),
  enrollment_id   UUID,  -- FK added after wellness_enrollments exists
  subtotal        NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
  tax_amount      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total           NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  currency        TEXT NOT NULL DEFAULT 'INR',
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled', 'refunded')),
  due_date        DATE NOT NULL,
  paid_at         TIMESTAMPTZ,
  payment_method  TEXT,
  receipt_url     TEXT,
  notes           TEXT,
  line_items      JSONB NOT NULL DEFAULT '[]',
  created_by      UUID REFERENCES platform_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, invoice_number)
);

CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_contact ON invoices(contact_id);
CREATE INDEX idx_invoices_status ON invoices(tenant_id, status);
```

### transactions

```sql
CREATE TABLE transactions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  invoice_id    UUID NOT NULL REFERENCES invoices(id),
  amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency      TEXT NOT NULL DEFAULT 'INR',
  type          TEXT NOT NULL CHECK (type IN ('payment', 'refund')),
  status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed')),
  gateway_ref   TEXT,
  gateway_name  TEXT,
  processed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_invoice ON transactions(invoice_id);
CREATE INDEX idx_transactions_tenant ON transactions(tenant_id);
```

### notification_templates

```sql
CREATE TABLE notification_templates (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  channel       TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'sms', 'whatsapp')),
  event_type    TEXT NOT NULL,  -- 'appointment_reminder', 'enrollment_confirmed', etc.
  subject       TEXT,
  body_template TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    UUID REFERENCES platform_users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, channel, event_type)
);
```

### notification_log

```sql
CREATE TABLE notification_log (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    UUID NOT NULL REFERENCES tenants(id),
  recipient_id UUID NOT NULL REFERENCES platform_users(id),
  channel      TEXT NOT NULL,
  event_type   TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'bounced')),
  sent_at      TIMESTAMPTZ,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_tenant ON notification_log(tenant_id, created_at DESC);
CREATE INDEX idx_notifications_recipient ON notification_log(recipient_id, created_at DESC);
```

### documents

```sql
CREATE TABLE documents (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  contact_id     UUID REFERENCES contacts(id),
  uploaded_by    UUID NOT NULL REFERENCES platform_users(id),
  file_name      TEXT NOT NULL,
  file_path      TEXT NOT NULL,  -- Supabase Storage path
  file_type      TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
  category       TEXT,  -- 'consent', 'report', 'prescription', 'photo', 'other'
  access_level   TEXT NOT NULL DEFAULT 'private'
    CHECK (access_level IN ('public', 'private', 'restricted')),
  storage_bucket TEXT NOT NULL DEFAULT 'documents',
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_documents_contact ON documents(contact_id);
```

---

## Domain 3: WellnessOS (Layer 3)

### wellness_clients

```sql
CREATE TABLE wellness_clients (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id                UUID NOT NULL REFERENCES tenants(id),
  contact_id               UUID NOT NULL REFERENCES contacts(id),
  emergency_contact_name   TEXT,
  emergency_contact_phone  TEXT,
  blood_type               TEXT CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  lifestyle_notes          TEXT,
  primary_practitioner_id  UUID REFERENCES platform_users(id),
  enrollment_status        TEXT NOT NULL DEFAULT 'registered'
    CHECK (enrollment_status IN ('registered', 'active', 'inactive', 'discharged')),
  created_by               UUID REFERENCES platform_users(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, contact_id)
);

CREATE INDEX idx_wellness_clients_tenant ON wellness_clients(tenant_id);
CREATE INDEX idx_wellness_clients_contact ON wellness_clients(contact_id);
CREATE INDEX idx_wellness_clients_practitioner ON wellness_clients(primary_practitioner_id);
```

### coach_assignments

```sql
CREATE TABLE coach_assignments (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  client_id        UUID NOT NULL REFERENCES wellness_clients(id),
  practitioner_id  UUID NOT NULL REFERENCES platform_users(id),
  role             TEXT NOT NULL DEFAULT 'primary'
    CHECK (role IN ('primary', 'secondary', 'specialist', 'temporary')),
  start_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date         DATE,
  status           TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'transferred', 'revoked')),
  assigned_by      UUID NOT NULL REFERENCES platform_users(id),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_coach_assign_tenant ON coach_assignments(tenant_id);
CREATE INDEX idx_coach_assign_client ON coach_assignments(client_id, status);
CREATE INDEX idx_coach_assign_practitioner ON coach_assignments(practitioner_id, status);
CREATE INDEX idx_coach_assign_access
  ON coach_assignments(tenant_id, client_id, practitioner_id, status)
  WHERE status = 'active';  -- used by health-data RLS
```

### health_assessments

```sql
CREATE TABLE health_assessments (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  client_id             UUID NOT NULL REFERENCES wellness_clients(id),
  assessed_by           UUID NOT NULL REFERENCES platform_users(id),
  assessment_type       TEXT NOT NULL DEFAULT 'initial'
    CHECK (assessment_type IN ('initial', 'follow_up', 'discharge', 'specialist')),
  status                TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'reviewed', 'approved')),
  medical_history       TEXT,
  current_medications   JSONB NOT NULL DEFAULT '[]',  -- [{name, dosage, frequency, since}]
  allergies             JSONB NOT NULL DEFAULT '[]',  -- [{allergen, severity, reaction}]
  existing_conditions   JSONB NOT NULL DEFAULT '[]',  -- [{condition, diagnosed_date, status}]
  family_history        TEXT,
  lifestyle_data        JSONB NOT NULL DEFAULT '{}',  -- {smoking, alcohol, exercise_freq, sleep_hours, stress_level}
  height_cm             NUMERIC(5,1),
  initial_weight_kg     NUMERIC(5,1),
  bmi                   NUMERIC(4,1),
  blood_pressure_systolic  INT,
  blood_pressure_diastolic INT,
  practitioner_notes    TEXT,
  referral_needed       BOOLEAN NOT NULL DEFAULT false,
  sensitivity_level     TEXT NOT NULL DEFAULT 'standard'
    CHECK (sensitivity_level IN ('standard', 'restricted')),
  reviewed_by           UUID REFERENCES platform_users(id),
  reviewed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assessments_tenant ON health_assessments(tenant_id);
CREATE INDEX idx_assessments_client ON health_assessments(client_id, created_at DESC);
CREATE INDEX idx_assessments_access
  ON health_assessments(tenant_id, client_id);  -- used by RLS
```

### health_measurements

```sql
CREATE TABLE health_measurements (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id                UUID NOT NULL REFERENCES tenants(id),
  client_id                UUID NOT NULL REFERENCES wellness_clients(id),
  recorded_by              UUID NOT NULL REFERENCES platform_users(id),
  measurement_date         DATE NOT NULL,
  weight_kg                NUMERIC(5,1),
  waist_cm                 NUMERIC(5,1),
  hip_cm                   NUMERIC(5,1),
  chest_cm                 NUMERIC(5,1),
  arm_cm                   NUMERIC(5,1),
  thigh_cm                 NUMERIC(5,1),
  bmi                      NUMERIC(4,1),
  body_fat_pct             NUMERIC(4,1),
  muscle_mass_pct          NUMERIC(4,1),
  blood_pressure_systolic  INT,
  blood_pressure_diastolic INT,
  resting_heart_rate       INT,
  sleep_hours              NUMERIC(3,1),
  activity_minutes         INT,
  water_ml                 INT,
  source                   TEXT DEFAULT 'manual'
    CHECK (source IN ('manual', 'device', 'import')),
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, client_id, measurement_date, source)
);

CREATE INDEX idx_measurements_client ON health_measurements(client_id, measurement_date DESC);
CREATE INDEX idx_measurements_tenant ON health_measurements(tenant_id);
```

### care_plans

```sql
CREATE TABLE care_plans (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id          UUID NOT NULL REFERENCES tenants(id),
  client_id          UUID NOT NULL REFERENCES wellness_clients(id),
  created_by         UUID NOT NULL REFERENCES platform_users(id),
  title              TEXT NOT NULL,
  plan_type          TEXT NOT NULL
    CHECK (plan_type IN ('weight_loss', 'fitness', 'nutrition', 'wellness', 'custom')),
  status             TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_approval', 'approved', 'active', 'completed', 'archived')),
  start_date         DATE,
  review_date        DATE,
  end_date           DATE,
  goals              JSONB NOT NULL DEFAULT '[]',
  milestones         JSONB NOT NULL DEFAULT '[]',
  current_version_id UUID,  -- FK added after care_plan_versions exists
  approved_by        UUID REFERENCES platform_users(id),
  approved_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (
    status != 'approved' OR approved_by IS NOT NULL
  ),
  CHECK (
    status != 'active' OR (start_date IS NOT NULL AND approved_by IS NOT NULL)
  )
);

CREATE INDEX idx_care_plans_client ON care_plans(client_id, status);
CREATE INDEX idx_care_plans_tenant ON care_plans(tenant_id);
```

### care_plan_versions

```sql
CREATE TABLE care_plan_versions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  care_plan_id    UUID NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
  version_number  INT NOT NULL CHECK (version_number > 0),
  content         JSONB NOT NULL,
  changes_summary TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_approval', 'approved', 'superseded')),
  created_by      UUID NOT NULL REFERENCES platform_users(id),
  approved_by     UUID REFERENCES platform_users(id),
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (care_plan_id, version_number),
  CHECK (
    status != 'approved' OR approved_by IS NOT NULL
  )
);

ALTER TABLE care_plans
  ADD CONSTRAINT fk_care_plans_version
  FOREIGN KEY (current_version_id) REFERENCES care_plan_versions(id);
```

### food_items

```sql
CREATE TABLE food_items (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT NOT NULL,
  name_telugu      TEXT,
  name_hindi       TEXT,
  category         TEXT NOT NULL,  -- 'grain', 'vegetable', 'fruit', 'dairy', 'protein', etc.
  calories_per_100g NUMERIC(6,1) NOT NULL CHECK (calories_per_100g >= 0),
  protein_g        NUMERIC(5,1) NOT NULL DEFAULT 0,
  carbs_g          NUMERIC(5,1) NOT NULL DEFAULT 0,
  fat_g            NUMERIC(5,1) NOT NULL DEFAULT 0,
  fiber_g          NUMERIC(5,1) NOT NULL DEFAULT 0,
  sodium_mg        NUMERIC(6,1) NOT NULL DEFAULT 0,
  is_vegetarian    BOOLEAN NOT NULL DEFAULT false,
  is_vegan         BOOLEAN NOT NULL DEFAULT false,
  region           TEXT,  -- 'south_indian', 'north_indian', 'telugu', etc.
  cuisine_type     TEXT,
  verified         BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_food_items_category ON food_items(category);
CREATE INDEX idx_food_items_search ON food_items(name);
CREATE INDEX idx_food_items_region ON food_items(region) WHERE region IS NOT NULL;
```

Note: `food_items` is a global reference table, not tenant-scoped. Tenants can have custom recipes but the food database is shared.

### recipes

```sql
CREATE TABLE recipes (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID REFERENCES tenants(id),  -- NULL = global/system recipe
  name            TEXT NOT NULL,
  description     TEXT,
  prep_time_min   INT CHECK (prep_time_min >= 0),
  cook_time_min   INT CHECK (cook_time_min >= 0),
  servings        INT NOT NULL DEFAULT 1 CHECK (servings > 0),
  total_calories  NUMERIC(7,1),
  meal_type       TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'beverage')),
  dietary_tags    TEXT[] NOT NULL DEFAULT '{}',
  instructions    TEXT,
  image_url       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES platform_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipes_tenant ON recipes(tenant_id) WHERE tenant_id IS NOT NULL;
```

### recipe_ingredients

```sql
CREATE TABLE recipe_ingredients (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id    UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  food_item_id UUID REFERENCES food_items(id),
  custom_name  TEXT,  -- if not in food_items DB
  quantity     NUMERIC(7,2) NOT NULL,
  unit         TEXT NOT NULL,  -- 'g', 'ml', 'cup', 'tbsp', 'piece', etc.
  calories     NUMERIC(6,1),
  order_index  INT NOT NULL DEFAULT 0,

  CHECK (food_item_id IS NOT NULL OR custom_name IS NOT NULL)
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
```

### meal_plans

```sql
CREATE TABLE meal_plans (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  client_id   UUID NOT NULL REFERENCES wellness_clients(id),
  created_by  UUID NOT NULL REFERENCES platform_users(id),
  title       TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_approval', 'approved', 'active', 'completed', 'archived')),
  approved_by UUID REFERENCES platform_users(id),
  approved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (end_date >= start_date)
);

CREATE INDEX idx_meal_plans_client ON meal_plans(client_id, status);
CREATE INDEX idx_meal_plans_tenant ON meal_plans(tenant_id);
```

### meal_plan_items

```sql
CREATE TABLE meal_plan_items (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_plan_id       UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  day_of_week        INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  meal_type          TEXT NOT NULL
    CHECK (meal_type IN ('breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'evening_snack')),
  food_item_id       UUID REFERENCES food_items(id),
  recipe_id          UUID REFERENCES recipes(id),
  custom_description TEXT,
  portion_size       TEXT,
  calories           NUMERIC(6,1),
  notes              TEXT,
  order_index        INT NOT NULL DEFAULT 0,

  CHECK (food_item_id IS NOT NULL OR recipe_id IS NOT NULL OR custom_description IS NOT NULL)
);

CREATE INDEX idx_meal_plan_items_plan ON meal_plan_items(meal_plan_id);
```

### nutrition_entries

```sql
CREATE TABLE nutrition_entries (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id          UUID NOT NULL REFERENCES tenants(id),
  client_id          UUID NOT NULL REFERENCES wellness_clients(id),
  entry_date         DATE NOT NULL,
  meal_type          TEXT NOT NULL
    CHECK (meal_type IN ('breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'evening_snack')),
  food_item_id       UUID REFERENCES food_items(id),
  recipe_id          UUID REFERENCES recipes(id),
  custom_description TEXT,
  portion_size       TEXT,
  calories           NUMERIC(6,1),
  notes              TEXT,
  logged_by          UUID NOT NULL REFERENCES platform_users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nutrition_entries_client ON nutrition_entries(client_id, entry_date DESC);
CREATE INDEX idx_nutrition_entries_tenant ON nutrition_entries(tenant_id);
```

### exercise_library

```sql
CREATE TABLE exercise_library (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name              TEXT NOT NULL UNIQUE,
  category          TEXT NOT NULL,  -- 'cardio', 'strength', 'flexibility', 'balance', 'yoga'
  muscle_groups     TEXT[] NOT NULL DEFAULT '{}',
  difficulty        TEXT NOT NULL DEFAULT 'beginner'
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  instructions      TEXT,
  video_url         TEXT,
  equipment_needed  TEXT[] NOT NULL DEFAULT '{}',
  contraindications TEXT[] NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exercises_category ON exercise_library(category);
```

Note: `exercise_library` is a global reference table, not tenant-scoped.

### activity_plans

```sql
CREATE TABLE activity_plans (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  client_id   UUID NOT NULL REFERENCES wellness_clients(id),
  created_by  UUID NOT NULL REFERENCES platform_users(id),
  title       TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_approval', 'approved', 'active', 'completed', 'archived')),
  approved_by UUID REFERENCES platform_users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (end_date >= start_date)
);

CREATE INDEX idx_activity_plans_client ON activity_plans(client_id, status);
CREATE INDEX idx_activity_plans_tenant ON activity_plans(tenant_id);
```

### activity_plan_items

```sql
CREATE TABLE activity_plan_items (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_plan_id UUID NOT NULL REFERENCES activity_plans(id) ON DELETE CASCADE,
  day_of_week      INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  exercise_id      UUID REFERENCES exercise_library(id),
  custom_exercise  TEXT,
  sets             INT,
  reps             INT,
  duration_min     INT,
  rest_seconds     INT,
  notes            TEXT,
  order_index      INT NOT NULL DEFAULT 0,

  CHECK (exercise_id IS NOT NULL OR custom_exercise IS NOT NULL)
);

CREATE INDEX idx_activity_plan_items_plan ON activity_plan_items(activity_plan_id);
```

### activity_logs

```sql
CREATE TABLE activity_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  client_id       UUID NOT NULL REFERENCES wellness_clients(id),
  log_date        DATE NOT NULL,
  exercise_id     UUID REFERENCES exercise_library(id),
  custom_activity TEXT,
  duration_min    INT CHECK (duration_min > 0),
  calories_burned NUMERIC(6,1),
  intensity       TEXT CHECK (intensity IN ('low', 'moderate', 'high', 'very_high')),
  notes           TEXT,
  logged_by       UUID NOT NULL REFERENCES platform_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_logs_client ON activity_logs(client_id, log_date DESC);
CREATE INDEX idx_activity_logs_tenant ON activity_logs(tenant_id);
```

### habit_definitions

```sql
CREATE TABLE habit_definitions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID REFERENCES tenants(id),  -- NULL = global/system habit
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,  -- 'hydration', 'sleep', 'exercise', 'mindfulness', 'nutrition'
  frequency   TEXT NOT NULL DEFAULT 'daily'
    CHECK (frequency IN ('daily', 'weekly', 'custom')),
  target_value NUMERIC(8,2),
  unit        TEXT,  -- 'ml', 'hours', 'minutes', 'count'
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES platform_users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### habit_checkins

```sql
CREATE TABLE habit_checkins (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    UUID NOT NULL REFERENCES tenants(id),
  client_id    UUID NOT NULL REFERENCES wellness_clients(id),
  habit_id     UUID NOT NULL REFERENCES habit_definitions(id),
  checkin_date DATE NOT NULL,
  value        NUMERIC(8,2),
  completed    BOOLEAN NOT NULL DEFAULT false,
  notes        TEXT,
  logged_by    UUID NOT NULL REFERENCES platform_users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, client_id, habit_id, checkin_date)
);

CREATE INDEX idx_habit_checkins_client ON habit_checkins(client_id, checkin_date DESC);
```

### wellness_programs

```sql
CREATE TABLE wellness_programs (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  name             TEXT NOT NULL,
  description      TEXT,
  duration_days    INT NOT NULL CHECK (duration_days > 0),
  program_type     TEXT NOT NULL
    CHECK (program_type IN ('weight_loss', 'fitness', 'nutrition', 'wellness', 'custom')),
  price            NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL DEFAULT 'INR',
  requires_payment BOOLEAN NOT NULL DEFAULT false,
  inclusions       JSONB NOT NULL DEFAULT '[]',
  session_credits  INT NOT NULL DEFAULT 0 CHECK (session_credits >= 0),
  status           TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  renewal_policy   TEXT DEFAULT 'manual'
    CHECK (renewal_policy IN ('manual', 'auto', 'prompt')),
  refund_policy    TEXT,
  created_by       UUID REFERENCES platform_users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, name) WHERE status != 'archived'
);

CREATE INDEX idx_programs_tenant ON wellness_programs(tenant_id, status);
```

### wellness_enrollments

```sql
CREATE TABLE wellness_enrollments (
  id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id                 UUID NOT NULL REFERENCES tenants(id),
  client_id                 UUID NOT NULL REFERENCES wellness_clients(id),
  program_id                UUID NOT NULL REFERENCES wellness_programs(id),
  start_date                DATE NOT NULL,
  end_date                  DATE NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'expired')),
  sessions_used             INT NOT NULL DEFAULT 0 CHECK (sessions_used >= 0),
  sessions_total            INT NOT NULL DEFAULT 0 CHECK (sessions_total >= 0),
  pause_start               DATE,
  pause_end                 DATE,
  enrolled_by               UUID NOT NULL REFERENCES platform_users(id),
  invoice_id                UUID REFERENCES invoices(id),
  -- Interim payment interface (see Architecture Section 10)
  enrollment_payment_status TEXT NOT NULL DEFAULT 'not_required'
    CHECK (enrollment_payment_status IN (
      'not_required', 'pending', 'paid', 'partial', 'overdue', 'refunded'
    )),
  enrollment_payment_notes  TEXT,
  enrollment_payment_ref    TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (end_date >= start_date),
  CHECK (sessions_used <= sessions_total OR sessions_total = 0),
  CHECK (
    status != 'paused' OR (pause_start IS NOT NULL)
  )
);

CREATE INDEX idx_enrollments_client ON wellness_enrollments(client_id, status);
CREATE INDEX idx_enrollments_tenant ON wellness_enrollments(tenant_id);
CREATE INDEX idx_enrollments_program ON wellness_enrollments(program_id);

-- Add FK from leads to enrollments
ALTER TABLE leads
  ADD CONSTRAINT fk_leads_enrollment
  FOREIGN KEY (enrollment_id) REFERENCES wellness_enrollments(id);
```

### wellness_reviews

```sql
CREATE TABLE wellness_reviews (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  client_id        UUID NOT NULL REFERENCES wellness_clients(id),
  reviewer_id      UUID NOT NULL REFERENCES platform_users(id),
  review_date      DATE NOT NULL,
  review_type      TEXT NOT NULL
    CHECK (review_type IN ('weekly', 'monthly', 'quarterly', 'discharge', 'ad_hoc')),
  findings         TEXT,
  goal_progress    JSONB NOT NULL DEFAULT '{}',
  plan_adjustments TEXT,
  client_feedback  TEXT,
  client_satisfaction INT CHECK (client_satisfaction BETWEEN 1 AND 5),
  next_review_date DATE,
  status           TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'completed', 'acknowledged')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_client ON wellness_reviews(client_id, review_date DESC);
CREATE INDEX idx_reviews_tenant ON wellness_reviews(tenant_id);
```

### ai_wellness_agents

```sql
CREATE TABLE ai_wellness_agents (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  agent_type        TEXT NOT NULL,  -- 'intake', 'nutrition', 'fitness', 'general', etc.
  name              TEXT NOT NULL,
  system_prompt     TEXT NOT NULL,
  knowledge_base_ids UUID[] NOT NULL DEFAULT '{}',
  tools             JSONB NOT NULL DEFAULT '[]',
  escalation_rules  JSONB NOT NULL DEFAULT '{}',
  usage_quota       JSONB NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'disabled')),
  created_by        UUID REFERENCES platform_users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, agent_type)
);
```

### ai_wellness_conversations

```sql
CREATE TABLE ai_wellness_conversations (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  client_id     UUID NOT NULL REFERENCES wellness_clients(id),
  agent_id      UUID NOT NULL REFERENCES ai_wellness_agents(id),
  messages      JSONB NOT NULL DEFAULT '[]',
  escalated     BOOLEAN NOT NULL DEFAULT false,
  escalated_to  UUID REFERENCES platform_users(id),
  escalated_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_convos_client ON ai_wellness_conversations(client_id, created_at DESC);
CREATE INDEX idx_ai_convos_tenant ON ai_wellness_conversations(tenant_id);
```

---

## Triggers

### updated_at auto-update

```sql
-- Enable moddatetime extension
CREATE EXTENSION IF NOT EXISTS moddatetime;

-- Apply to all tables with updated_at column
-- (one trigger per table, example shown for platform_users)
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON platform_users
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

-- Repeat for each table...
```

### Enrollment payment sync (Phase 5, when Finance Core ships)

```sql
-- Trigger: when invoice status changes, update enrollment payment status
CREATE OR REPLACE FUNCTION sync_enrollment_payment_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.enrollment_id IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE wellness_enrollments
    SET enrollment_payment_status = CASE NEW.status
      WHEN 'paid' THEN 'paid'
      WHEN 'partial' THEN 'partial'
      WHEN 'overdue' THEN 'overdue'
      WHEN 'refunded' THEN 'refunded'
      WHEN 'sent' THEN 'pending'
      ELSE enrollment_payment_status
    END,
    updated_at = now()
    WHERE id = NEW.enrollment_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invoice_enrollment_sync
  AFTER UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION sync_enrollment_payment_status();
```

---

## Table Count Summary

| Domain | Tables | Notes |
|---|---|---|
| Platform (Layer 1) | 19 | Auth, tenants, branches, modules, entitlements, delegation, branding, tags, vocab, audit |
| Business Core (Layer 2) | 12 | Contacts, leads, calendar, staff, finance, notifications, documents |
| WellnessOS (Layer 3) | 21 | Clients, assessments, measurements, care plans, nutrition, fitness, habits, programs, reviews, AI |
| **Total** | **52** | |

---

*This is a PROPOSED DESIGN. No migrations will be run until the owner approves.*

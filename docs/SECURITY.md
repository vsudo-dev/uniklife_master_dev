# UNIKLIFE.AI — Security & Authorization Model (v0.3.0)

**Version:** 0.3.0  
**Date:** 2026-10-28  
**Status:** PROPOSED — Pending owner approval

---

## 1. Threat Model Summary

| Threat | Example | Mitigation |
|---|---|---|
| Cross-tenant data leak | Tenant A queries Tenant B's contacts | RLS on every tenant-owned table; tenant_id enforced in every query |
| Privilege escalation | Staff user changes own role to tenant_admin | Role changes require tenant_admin+ authority; CHECK constraints on role values |
| Health data unauthorized access | Receptionist views patient clinical records | Assignment-based RLS; professional-scope checks; no blanket role access |
| Support self-grant | Support team member creates own permission grant | DB-level CHECK (grantee ≠ grantor); grantor must be super_admin |
| Cross-tenant FK injection | INSERT with branch_id from another tenant | Tenant-scoped uniqueness constraints; RLS on INSERT; FK + RLS combined |
| Service-role key leak | Browser exposes service_role key | service_role key ONLY in Edge Functions + Vault; browser uses anon key only |
| Stale permission cache | Revoked grant still works from cached state | No client-side permission caching for privileged ops; server re-checks on every request |
| Session hijack | Stolen JWT used from different IP | Supabase Auth handles JWT lifecycle; MFA for Tier 1/2; session rotation |

---

## 2. Identity Resolution

### 2.1 Identity Chain

```
auth.uid() (Supabase session)
     │
     │  platform_users.auth_user_id = auth.uid()
     ▼
platform_users.id (application identity)
     │
     │  tenant_memberships.user_id = platform_users.id
     ▼
tenant_memberships (tenant-scoped role)
     │
     │  branch_assignments.membership_id = tenant_memberships.id
     ▼
branch_assignments (branch-scoped access)
```

### 2.2 Identity Functions (SECURITY DEFINER)

| Function | Returns | Used By |
|---|---|---|
| `auth.platform_user_id()` | UUID — platform_users.id for current session | All RLS policies |
| `auth.active_tenant_ids()` | SETOF UUID — tenant_ids with active membership | Tenant-scoped RLS |
| `auth.tenant_role(tenant_id)` | TEXT — role in specific tenant | Role-based RLS |
| `auth.can_access_health_data(tenant_id, client_id)` | BOOLEAN — assignment-based health access | Health table RLS |
| `auth.has_branch_access(tenant_id, branch_id)` | BOOLEAN — branch assignment check | Branch-scoped RLS |

All functions are `STABLE SECURITY DEFINER` — they run with the definer's privileges but return stable results within a transaction.

---

## 3. RLS Policy Templates

### 3.1 Standard Tenant Isolation (most tables)

```sql
-- SELECT
CREATE POLICY "tenant_select" ON {table}
  FOR SELECT USING (
    tenant_id IN (SELECT auth.active_tenant_ids())
  );

-- INSERT
CREATE POLICY "tenant_insert" ON {table}
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT auth.active_tenant_ids())
  );

-- UPDATE
CREATE POLICY "tenant_update" ON {table}
  FOR UPDATE USING (
    tenant_id IN (SELECT auth.active_tenant_ids())
  );

-- DELETE (soft delete preferred, but policy covers hard delete too)
CREATE POLICY "tenant_delete" ON {table}
  FOR DELETE USING (
    tenant_id IN (SELECT auth.active_tenant_ids())
  );
```

### 3.2 Branch-Scoped Access

```sql
CREATE POLICY "branch_select" ON {table}
  FOR SELECT USING (
    tenant_id IN (SELECT auth.active_tenant_ids())
    AND (
      branch_id IS NULL  -- not branch-scoped
      OR auth.has_branch_access(tenant_id, branch_id)
    )
  );
```

### 3.3 Health Data (Assignment-Based)

```sql
-- Applied to: health_assessments, health_measurements, care_plans,
--             care_plan_versions, meal_plans, activity_plans,
--             nutrition_entries, activity_logs, wellness_reviews

CREATE POLICY "health_data_select" ON {table}
  FOR SELECT USING (
    auth.can_access_health_data(tenant_id, client_id)
  );

CREATE POLICY "health_data_insert" ON {table}
  FOR INSERT WITH CHECK (
    auth.can_access_health_data(tenant_id, client_id)
  );
```

### 3.4 Customer Self-Access

```sql
-- contacts: customer sees own record only
CREATE POLICY "customer_self_select" ON contacts
  FOR SELECT USING (
    -- Staff/admin path: tenant membership
    tenant_id IN (SELECT auth.active_tenant_ids())
    AND (
      auth.tenant_role(tenant_id) IN ('tenant_admin', 'practitioner', 'staff')
      OR auth_user_id = auth.uid()  -- customer sees own contact
    )
  );
```

### 3.5 Platform-Level Tables (no tenant_id)

```sql
-- platform_users: users see own record; super_admin sees all
CREATE POLICY "platform_users_select" ON platform_users
  FOR SELECT USING (
    id = auth.platform_user_id()
    OR (SELECT platform_role FROM platform_users WHERE id = auth.platform_user_id()) = 'super_admin'
  );

-- global_modules: readable by all authenticated users
CREATE POLICY "modules_select" ON global_modules
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- global_modules: writable only by super_admin
CREATE POLICY "modules_write" ON global_modules
  FOR ALL USING (
    (SELECT platform_role FROM platform_users WHERE id = auth.platform_user_id()) = 'super_admin'
  );
```

---

## 4. Authorization by Tier

### 4.1 Tier 1: Super Admin

| Can Do | Cannot Do |
|---|---|
| Create/manage tenants | Direct SELECT on health data (must use privileged function) |
| Create/manage branches | Bypass audit logging |
| Invite members | Act without leaving audit trail |
| Grant/revoke support delegations | Self-delegate (no one to delegate TO themselves) |
| Change module entitlements | Access tenant data without scoped function call |
| View tenant operational summaries | |
| Compliance investigation (with legal_ref, logged) | |
| Manage industry profiles, module registry | |

### 4.2 Tier 2: Dev Support/Ops

| Can Do (with active grant) | Cannot Do |
|---|---|
| Actions listed in their `support_permission_grants` | Anything not explicitly granted |
| Request actions that require approval | Self-grant permissions |
| View operational data within granted scope | Self-approve action requests |
| | Access health data |
| | Act on tenants/modules outside their grant scope |
| | Create new grants for others |

### 4.3 Tier 3: Tenant Admin

| Can Do | Cannot Do |
|---|---|
| Manage tenant settings, branding | Direct SELECT on clinical health data |
| Manage staff, branches | Change platform-level settings |
| View all business data in tenant | Enable/disable restricted modules |
| Assign practitioners to clients | Access other tenants |
| Create programs, services | Grant themselves Super Admin |
| View operational health summaries | |
| Admin health record access (logged, with reason) | |

### 4.4 Tier 4: Practitioner/Staff

| Can Do (Practitioner) | Can Do (Staff) | Cannot Do |
|---|---|---|
| Access assigned clients' health data | Access business data in branch | Access unassigned clients' health data |
| Create/edit care plans, assessments | Manage appointments, contacts | Approve own care plans |
| Log measurements, meal plans | Upload documents | Change tenant settings |
| View own caseload | View own tasks | Access other branches (unless assigned) |

### 4.5 Tier 5: Customer

| Can Do | Cannot Do |
|---|---|
| View own profile, contact record | View other customers' data |
| View own health data (approved plans, measurements) | View draft/unapproved plans |
| Log own meal diary, activity, habits | Edit practitioner-created records |
| Book appointments | Access staff-only areas |
| Chat with AI agent (if enabled) | Change own role |

---

## 5. Cross-Tenant FK Attack Prevention

### Problem
A malicious user inserts a record with a `branch_id` that belongs to another tenant. If only a FK constraint exists (no tenant check), the insert succeeds and the record appears valid.

### Solution: Tenant-Scoped FK Enforcement

For every FK that references a tenant-scoped table, the INSERT/UPDATE RLS policy verifies that the referenced entity belongs to the same tenant:

```sql
-- Example: appointments references branches
-- RLS on INSERT ensures branch_id belongs to the same tenant
CREATE POLICY "appointment_insert" ON appointments
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT auth.active_tenant_ids())
    AND branch_id IN (
      SELECT id FROM branches WHERE tenant_id = appointments.tenant_id
    )
    AND staff_user_id IN (
      SELECT user_id FROM tenant_memberships
      WHERE tenant_id = appointments.tenant_id AND status = 'active'
    )
    AND contact_id IN (
      SELECT id FROM contacts WHERE tenant_id = appointments.tenant_id
    )
  );
```

For tables with many FK references, this check is extracted into a validation function:

```sql
CREATE OR REPLACE FUNCTION validate_appointment_refs(
  p_tenant_id uuid, p_branch_id uuid, p_staff_id uuid, p_contact_id uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    EXISTS (SELECT 1 FROM branches WHERE id = p_branch_id AND tenant_id = p_tenant_id)
    AND EXISTS (SELECT 1 FROM tenant_memberships WHERE user_id = p_staff_id AND tenant_id = p_tenant_id AND status = 'active')
    AND EXISTS (SELECT 1 FROM contacts WHERE id = p_contact_id AND tenant_id = p_tenant_id);
$$;
```

---

## 6. Privileged Operations (Backend Only)

These operations use `SECURITY DEFINER` functions invoked through Supabase Edge Functions. They are never exposed through PostgREST.

| Function | Caller | Access Level | Audit |
|---|---|---|---|
| `platform_tenant_summary(tenant_id)` | Super Admin | Aggregate counts, no PII | Standard |
| `platform_manage_user(user_id, action)` | Super Admin | Auth/membership records | Standard |
| `platform_change_entitlement(tenant_id, module_id, action)` | Super Admin or delegated Support | Entitlement records | Standard + delegation audit |
| `platform_investigate_record(tenant_id, type, id, reason, legal_ref)` | Super Admin | Full record, requires legal_ref | Enhanced + tenant_admin notification |
| `platform_export_tenant_data(tenant_id, reason, legal_ref)` | Super Admin | All tenant data | Enhanced + tenant_admin notification |
| `admin_read_health_record(tenant_id, record_id, reason)` | Tenant Admin | Single health record | health_data_access_log |

### Enhanced Audit
Enhanced audit includes:
- All fields from standard audit
- `legal_ref` (required, non-empty)
- Notification sent to tenant_admin of the affected tenant
- Record immutable (no UPDATE/DELETE on enhanced audit rows)

---

## 7. Session & Token Security

| Aspect | Implementation |
|---|---|
| JWT issuer | Supabase Auth (RS256) |
| Token lifetime | 1 hour (Supabase default), refresh token rotates |
| MFA | Required for Tier 1 (Super Admin) and Tier 2 (Support/Ops) |
| Password policy | Minimum 8 characters (Supabase Auth default, configurable) |
| Session storage | httpOnly cookie or localStorage (Supabase client handles) |
| CORS | Restricted to app domain(s) |
| Rate limiting | Supabase Auth built-in; Edge Functions can add custom limits |

---

## 8. Storage Security

| Bucket | Access | Policy |
|---|---|---|
| `public` | Tenant logos, branding | Read: anyone. Write: tenant_admin only. |
| `documents` | Uploads, reports | Read/Write: tenant members with appropriate role. |
| `health-data` | Clinical files, prescriptions | Read: assignment-based (same as health table RLS). Write: practitioner + tenant_admin. Access logged. |

Storage policies mirror table RLS — a user who cannot read `health_assessments` also cannot download files from the `health-data` bucket for that client.

---

## 9. Data Classification

| Classification | Tables | Access | Logging |
|---|---|---|---|
| **Public** | global_modules, industry_profiles, food_items, exercise_library | All authenticated users | Standard |
| **Tenant Business** | contacts, leads, appointments, services, invoices, staff_profiles | Tenant members by role | Standard |
| **Tenant Restricted** | tenant_branding, tenant_entitlements, tenant_feature_settings | Tenant admin only | Standard |
| **Health Standard** | health_measurements, meal_plans, activity_plans, nutrition_entries, habit_checkins | Assignment-based | Standard |
| **Health Sensitive** | health_assessments (especially sensitivity_level = 'restricted'), care_plans, wellness_reviews | Assignment-based + sensitivity check | health_data_access_log |
| **Platform Admin** | support_permission_grants, support_action_requests, audit_logs | Super Admin only | privileged_operation_log |

---

## 10. Compliance Considerations

| Area | Status | Notes |
|---|---|---|
| DPDPA 2023 (India) | Tracked | Consent fields on contacts; access logging; data export function |
| Data residency | TBD | Supabase region selection (Mumbai proposed) |
| Right to erasure | Designed | Soft delete + hard delete function (with audit) |
| Data portability | Designed | `platform_export_tenant_data` function |
| Consent management | Designed | `consent_given_at`, `consent_type` on contacts |
| Breach notification | TBD | Monitoring and alerting to be defined |

---

*This is a PROPOSED DESIGN. No security implementations will be deployed until the owner approves.*

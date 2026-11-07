# UNIKLIFE.AI — System Architecture v0.3.0

**Version:** 0.3.0  
**Date:** 2026-10-28  
**Status:** PROPOSED DESIGN — Pending owner approval  
**Phase:** Phase 0 — Architecture Blueprint  
**Supersedes:** ARCHITECTURE v0.2.0

---

## 0. Architecture Decisions Register

| # | Decision | Choice | Status |
|---|---|---|---|
| AD-01 | CRM integration | MyAppz (SaaSUniverse) is the CRM backbone for Stage 1. UNIKLIFE.AI connects to MyAppz API for contacts, bookings, billing, campaigns, and automations. Own CRM is the long-term Stage 3 goal. See `docs/VISION_AND_STRATEGY.md`. | UPDATED 2026-11-02 |
| AD-02 | Authentication | Independent Supabase Auth. Five-tier hierarchy. Future SSO optional. | CONFIRMED |
| AD-03 | Application type | Standalone app, own URL, own codebase, own Supabase database. | CONFIRMED |
| AD-04 | Architecture order | Global SaaS Core first, then wellness vertical on top. | CONFIRMED |
| AD-05 | Frontend | React + TypeScript + Vite | CONFIRMED |
| AD-06 | Database | Supabase PostgreSQL with RLS | CONFIRMED |
| AD-07 | Storage | Supabase Storage (private buckets for health data) | CONFIRMED |
| AD-08 | Hosting (future) | Cloudflare Workers with Static Assets | CONFIRMED |
| AD-09 | No D1/R2 | Cloudflare D1 and R2 not used | CONFIRMED |
| AD-10 | Environments | One repo, one migration set. Dev now, Demo on request, Prod later. | CONFIRMED |
| AD-11 | UI library | shadcn/ui + Tailwind CSS | APPROVED |
| AD-12 | Payment provider | TBD — Razorpay proposed | PENDING |
| AD-13 | State management | TanStack Query + Zustand | APPROVED |
| AD-14 | Email provider | TBD — Resend proposed | PENDING |
| AD-15 | SMS/WhatsApp provider | TBD — MSG91 proposed | PENDING |
| AD-16 | Identity model | Single auth.users row per person, platform_users profile, tenant_memberships per tenancy | CONFIRMED (v0.3.0) |
| AD-17 | Health-data access | Assignment-based + professional-scope. Not role-only. | CONFIRMED (v0.3.0) |
| AD-18 | Super Admin data access | Scoped privileged operations via backend functions. No blanket service-role bypass. | CONFIRMED (v0.3.0) |
| AD-19 | Backend runtime | Supabase Edge Functions (Deno) now. Cloudflare Workers for hosting later. | CONFIRMED (v0.3.0) |
| AD-20 | Multi-industry strategy | One platform core serves all industries. WellnessOS is vertical 1. Real Estate, Finance, Education and others use the same core with their own vertical modules. Each industry connects to MyAppz CRM in Stage 1. | CONFIRMED 2026-11-02 |
| AD-21 | CRM Adapter pattern | A dedicated adapter layer (`src/lib/crm/`) abstracts all MyAppz API calls. UI pages call the adapter, not MyAppz directly. When own CRM is built in Stage 3, only the adapter is swapped — UI pages do not change. | CONFIRMED 2026-11-02 |
| AD-22 | Database split | Our Supabase DB is split into two sections: (A) Platform & Wellness — owned forever. (B) CRM mirror tables (contacts, appointments, invoices) — go idle once CRM Adapter is live, revived when own CRM is built. Nothing is deleted. | CONFIRMED 2026-11-02 |

---

## 1. System Overview

UNIKLIFE.AI is an independently owned, multi-tenant, multi-industry, white-label SaaS Business Operating System.

**Architecture principle:**
```
UNIKLIFE.AI Global SaaS Core
  → Industry-Specific Modules
    → Independent Tenant Applications
      → Optional CRM Integration (future)
```

The platform is **NOT** a CRM extension. It is a standalone application that may optionally connect to external CRM systems through a configurable integration gateway.

---

## 2. Five-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 5: INTEGRATION GATEWAY                               │
│  Optional external CRM connector (mock/disabled now)        │
│  Payment provider adapter · Messaging adapter               │
│  Webhook inbound/outbound · Event bus                       │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: ROLE-SPECIFIC EXPERIENCES                         │
│  A. Platform Super Admin console                            │
│  B. Development Support/Ops console                         │
│  C. Tenant Admin workspace                                  │
│  D. Practitioner/Staff workspace                            │
│  E. Patient/Customer portal + PWA                           │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: VERTICAL DOMAIN MODULES                           │
│  WellnessOS: Health assessments, progress tracking,         │
│  care plans, nutrition, fitness, wellness programs,          │
│  practitioner workspace, client portal                      │
│  (Future: Real Estate, Legal, Retail, Education, etc.)      │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: SHARED BUSINESS CORE                              │
│  Native CRM foundation · Calendar · Finance · Staff/HR      │
│  Workflow engine · AI infrastructure · Notifications        │
│  Documents · Analytics/BI · Tags · Vocabulary               │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: PLATFORM CONTROL PLANE                            │
│  Super Admin · Tenant provisioning · Industry Registry      │
│  Module Registry · Entitlement Engine · Platform billing    │
│  Support delegation · White-label · Feature flags           │
│  Audit & security                                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  INFRASTRUCTURE                                              │
│  Supabase PostgreSQL + Auth + Storage + Edge Functions       │
│  (Future: Cloudflare Workers for frontend hosting)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Identity Model (Correction #1)

### 3.1 Identity Chain

```
Supabase auth.users (one row per human)
       │
       │  1:1 (auth_user_id FK, UNIQUE)
       ▼
platform_users (profile, platform_role, status)
       │
       │  1:N (user_id FK)
       ▼
tenant_memberships (tenant_id, role, status)
       │
       │  1:N (membership_id FK)
       ▼
branch_assignments (branch_id, assigned_at)
       │
       ├── Staff path: staff_profiles (tenant_id, user_id FK to platform_users)
       │
       └── Customer path: contacts (tenant_id, auth_user_id FK to auth.users — nullable)
                │
                │  1:1 (contact_id FK, UNIQUE per tenant)
                ▼
          wellness_clients (tenant-scoped wellness extension)
```

### 3.2 Rules

1. **One auth.users row per human.** A person who is staff in Tenant A and a customer in Tenant B has one `auth.users` row, one `platform_users` row, two `tenant_memberships` rows.
2. **platform_users.auth_user_id** is the single join key between Supabase Auth and the application. It is `UNIQUE NOT NULL`.
3. **platform_users.platform_role** is one of: `super_admin`, `support_ops`, `tenant_user`. This is the platform-wide role. Tenant-specific roles live in `tenant_memberships.role`.
4. **tenant_memberships.role** is one of: `tenant_admin`, `practitioner`, `staff`, `customer`. This is the tenant-scoped role.
5. **contacts** represent people managed by a tenant (leads, patients, customers). A contact MAY have a linked `auth_user_id` (they can log in) or MAY NOT (offline/unregistered).
6. **contacts.auth_user_id** is nullable. When set, a `tenant_memberships` row with `role = 'customer'` also exists for that user+tenant pair. The membership row is the authority for access; the contact record is the business data.
7. **All RLS policies** resolve identity through: `auth.uid()` → `platform_users.auth_user_id` → `platform_users.id` → `tenant_memberships.user_id` = `platform_users.id`.

### 3.3 Identity Resolution Functions

```sql
-- Returns the platform_users.id for the current session.
CREATE OR REPLACE FUNCTION auth.platform_user_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM platform_users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Returns active tenant_ids for the current user.
CREATE OR REPLACE FUNCTION auth.active_tenant_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT tenant_id FROM tenant_memberships
  WHERE user_id = auth.platform_user_id()
    AND status = 'active';
$$;

-- Returns the role for a specific tenant.
CREATE OR REPLACE FUNCTION auth.tenant_role(p_tenant_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM tenant_memberships
  WHERE user_id = auth.platform_user_id()
    AND tenant_id = p_tenant_id
    AND status = 'active'
  LIMIT 1;
$$;
```

---

## 4. Five-Tier User Hierarchy

| Tier | Role | Scope | Auth Level |
|---|---|---|---|
| 1 | **Super Admin** | Platform-wide (scoped operations only) | Supabase Auth + MFA |
| 2 | **Dev Support/Ops** | Individually delegated scope only | Supabase Auth + MFA |
| 3 | **Tenant Admin** | Own tenant + authorized branches | Supabase Auth |
| 4 | **Practitioner/Staff** | Assigned clients/branch | Supabase Auth |
| 5 | **Patient/Customer** | Own data only | Supabase Auth (email/password) |

### 4.1 Authorization Resolution (deny-by-default)

```
 1. Is user authenticated?                        → No: DENY
 2. Resolve platform_users.id from auth.uid()     → Not found: DENY
 3. What is the active tenant context?             → No context: DENY (except platform-scoped ops for Tier 1/2)
 4. Is the tenant active?                          → No: DENY
 5. Does user have active membership in tenant?    → No: DENY
 6. Is the module entitled to this tenant?         → No: DENY
 7. Does user's tenant role permit this action?    → No: DENY
 8. Is user assigned to the target branch?         → No: DENY (if branch-scoped action)
 9. Is user assigned to the target resource?       → No: DENY (if resource requires assignment)
10. Does the action-specific policy allow it?      → No: DENY
11. ALLOW
```

Step 9 is critical for health data — see Section 5.

### 4.2 Support Delegation (Tier 2) — Normalized Model

```
support_permission_grants
  ├── id (PK)
  ├── grantee_user_id     → platform_users.id (the support person)
  ├── granted_by_user_id  → platform_users.id (must be super_admin)
  ├── permission_key      (e.g. 'module.entitlement.change', 'tenant.config.read')
  ├── tenant_scope_id     → tenants.id (NULL = all tenants — requires justification)
  ├── module_scope_id     → global_modules.id (NULL = all modules)
  ├── allowed_actions[]   (e.g. ['enable', 'disable', 'suspend'])
  ├── requires_approval   BOOLEAN (if true, action goes through approval queue)
  ├── effective_at        TIMESTAMPTZ NOT NULL
  ├── expires_at          TIMESTAMPTZ NOT NULL
  ├── reason              TEXT NOT NULL
  ├── status              ('active', 'expired', 'revoked')
  ├── revoked_at          TIMESTAMPTZ
  ├── revoked_by          → platform_users.id
  └── revoked_reason      TEXT

Constraints:
  - grantee_user_id ≠ granted_by_user_id (no self-grant)
  - granted_by must have platform_role = 'super_admin'
  - expires_at > effective_at
  - expires_at must be set (no indefinite grants)
  - CHECK (status IN ('active', 'expired', 'revoked'))
  - UNIQUE (grantee_user_id, permission_key, tenant_scope_id, module_scope_id)
    WHERE status = 'active'  -- only one active grant per scope
```

**Permission Precedence (highest wins):**
1. Explicit REVOKE (immediately effective, overrides everything)
2. Expiry (past `expires_at` → denied)
3. Specific scope (tenant+module) over broad scope (tenant-only or all)
4. `requires_approval = true` → action queued, not immediate

**Approval Queue:**
```
support_action_requests
  ├── id (PK)
  ├── requester_id        → platform_users.id
  ├── grant_id            → support_permission_grants.id
  ├── tenant_id           → tenants.id
  ├── module_id           → global_modules.id (nullable)
  ├── requested_action    TEXT NOT NULL
  ├── request_reason      TEXT NOT NULL
  ├── status              ('pending', 'approved', 'rejected', 'expired')
  ├── reviewer_id         → platform_users.id (must be super_admin)
  ├── review_reason       TEXT
  ├── requested_at        TIMESTAMPTZ NOT NULL DEFAULT now()
  ├── reviewed_at         TIMESTAMPTZ
  ├── expires_at          TIMESTAMPTZ NOT NULL (auto-expire if not reviewed)
  └── executed_at         TIMESTAMPTZ

Constraints:
  - reviewer_id ≠ requester_id (no self-approval)
  - reviewer must have platform_role = 'super_admin'
```

---

## 5. Health-Data Authorization Model (Correction #2)

### 5.1 Problem

v0.2.0 allowed any tenant_admin or practitioner to access all patients' health records within their tenant. This is wrong — a practitioner should see only their assigned patients; a tenant admin should see operational data but not necessarily raw clinical records.

### 5.2 Authorization Layers for Health Data

```
Layer 1: Tenant isolation (RLS)
  └── User must be active member of the tenant

Layer 2: Professional scope
  └── User's role must include health-data access capability
      tenant_admin  → operational summaries only (aggregates, not raw clinical)
      practitioner  → assigned patients' records only
      staff         → no health data access
      customer      → own records only

Layer 3: Assignment check
  └── Practitioner must have active coach_assignments row
      linking them to the specific client

Layer 4: Record sensitivity
  └── health_assessments.sensitivity_level = 'restricted'
      → only the assessing practitioner + tenant_admin via privileged function
```

### 5.3 Assignment-Based Access

```sql
-- Can the current user access this client's health data?
CREATE OR REPLACE FUNCTION auth.can_access_health_data(
  p_tenant_id uuid,
  p_client_id uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    -- Case 1: User is the client themselves
    SELECT 1 FROM wellness_clients wc
    JOIN contacts c ON c.id = wc.contact_id AND c.tenant_id = p_tenant_id
    WHERE wc.id = p_client_id
      AND c.auth_user_id = auth.uid()

    UNION ALL

    -- Case 2: User is an assigned practitioner with active assignment
    SELECT 1 FROM coach_assignments ca
    JOIN tenant_memberships tm ON tm.user_id = auth.platform_user_id()
      AND tm.tenant_id = p_tenant_id
      AND tm.status = 'active'
      AND tm.role = 'practitioner'
    WHERE ca.client_id = p_client_id
      AND ca.practitioner_id = tm.user_id
      AND ca.tenant_id = p_tenant_id
      AND ca.status = 'active'
      AND (ca.end_date IS NULL OR ca.end_date >= CURRENT_DATE)
  );
$$;

-- RLS policy for health_assessments
CREATE POLICY "health_assessment_access" ON health_assessments
  FOR SELECT USING (
    auth.can_access_health_data(tenant_id, client_id)
  );
```

### 5.4 Tenant Admin Health-Data Access

Tenant Admins access **operational summaries** (e.g., "Client X has 3 assessments, last reviewed 2026-10-15") through dedicated backend functions. They do NOT get direct SELECT on clinical detail tables via RLS.

If a Tenant Admin needs clinical detail (e.g., for a complaint investigation), a separate **privileged read** is logged:

```sql
CREATE OR REPLACE FUNCTION admin_read_health_record(
  p_tenant_id uuid,
  p_record_id uuid,
  p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_role text;
  v_result jsonb;
BEGIN
  v_user_id := auth.platform_user_id();
  v_role := auth.tenant_role(p_tenant_id);

  IF v_role != 'tenant_admin' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  INSERT INTO health_data_access_log
    (user_id, tenant_id, record_type, record_id, access_reason, accessed_at)
  VALUES
    (v_user_id, p_tenant_id, 'health_assessment', p_record_id, p_reason, now());

  SELECT row_to_json(ha.*) INTO v_result
  FROM health_assessments ha
  WHERE ha.id = p_record_id AND ha.tenant_id = p_tenant_id;

  RETURN v_result;
END;
$$;
```

### 5.5 Super Admin Health-Data Access (Correction #3)

Super Admin does NOT have blanket `service_role` bypass for clinical data.

**Scoped privileged operations for Super Admin:**

| Operation | Function | Access | Logging |
|---|---|---|---|
| Tenant operational summary | `platform_tenant_summary(tenant_id)` | Aggregate counts, no PII | Standard audit |
| User account management | `platform_manage_user(user_id, action)` | Auth/membership, no health data | Standard audit |
| Module entitlement change | `platform_change_entitlement(tenant_id, module_id, action)` | Entitlement records only | Standard audit |
| Compliance investigation | `platform_investigate_record(tenant_id, record_type, record_id, reason, legal_ref)` | Full record access, requires legal_ref | Enhanced audit + notification to tenant_admin |
| Data export (legal) | `platform_export_tenant_data(tenant_id, reason, legal_ref)` | All tenant data | Enhanced audit + notification |

Each function:
- Is `SECURITY DEFINER` (runs with elevated privileges)
- Verifies the caller is `super_admin` via `platform_users.platform_role`
- Logs the access to `privileged_operation_log` with reason, caller, timestamp
- Returns only the specific data requested, not a blanket result set
- Is exposed only through Supabase Edge Functions (server-side), never through PostgREST directly

---

## 6. Module Registry & Entitlement Engine (Correction #5)

### 6.1 Single Authoritative Dependency System

Module dependencies are defined ONLY in `global_modules.dependencies` (a JSONB array). No separate dependency table.

```json
// global_modules.dependencies example:
[
  {
    "module_key": "C01",
    "type": "required",
    "min_version": "1.0.0"
  }
]
```

**Dependency types:**
- `required`: Target module must be entitled and active before this module can be enabled.
- `optional`: If target is entitled, features integrate. If not, features degrade gracefully.
- `recommended`: UI shows suggestion, no enforcement.

### 6.2 Entitlement State Machine

```
              ┌──────────┐
     assign   │          │  activate
    ────────▶ │ PENDING  │ ──────────▶ ┌──────────┐
              │          │             │  ACTIVE   │
              └──────────┘             └──────────┘
                                         │      │
                              suspend    │      │  disable
                           ┌─────────────┘      └──────────┐
                           ▼                               ▼
                    ┌──────────┐                    ┌──────────┐
                    │ SUSPENDED│                    │ DISABLED │
                    └──────────┘                    └──────────┘
                           │                               │
                           │  reactivate                   │  re-enable
                           └───────────▶ ACTIVE ◀──────────┘

   From any state:
     expire (automatic when expiry_date passes) → EXPIRED
     EXPIRED → re-assign → PENDING
```

### 6.3 Safe Enable/Disable Behavior

**Enable:**
1. Check all `required` dependencies are ACTIVE for this tenant.
2. If any required dependency is not active → reject with list of missing dependencies.
3. Create/update `tenant_entitlements` row → status = 'PENDING'.
4. Run module's `on_enable` hook (create module-specific config if needed).
5. Transition to ACTIVE.

**Disable:**
1. Check if any other ACTIVE module depends on this one as `required`.
2. If dependents exist → reject with list of dependent modules. Cascade disable requires explicit confirmation.
3. Check for in-progress workflows using this module → warn, allow force-disable.
4. Transition to DISABLED.
5. Historical data is PRESERVED. Tables are not dropped. Data remains query-able through archived-data functions.
6. UI routes for this module return 404/disabled notice. API endpoints return 403 with `module_disabled` error code.

**Suspend (temporary):**
1. Same as disable, but status = SUSPENDED.
2. Data preserved, module can be reactivated without re-setup.
3. Useful for billing suspension or maintenance.

---

## 7. Backend Architecture (Correction #7)

### 7.1 Runtime Layers

```
┌────────────────────────────────────────────────────────┐
│  BROWSER (React SPA)                                    │
│  Only talks to Supabase client SDK                      │
│  Uses anon key only. Never sees service_role key.       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Supabase PostgREST (auto-generated REST API)          │
│  - CRUD on tables with RLS enforced                    │
│  - User-scoped operations only                         │
│  - anon + authenticated roles                          │
│                                                        │
│  Supabase Edge Functions (Deno runtime)                │
│  - Privileged server operations                        │
│  - Uses service_role key internally                    │
│  - Validates caller auth before acting                  │
│  - Complex business logic (booking, enrollment)        │
│  - External API calls (payments, email, SMS)           │
│  - Background job dispatch                             │
│                                                        │
│  Supabase Database Functions (PL/pgSQL)                │
│  - RLS helper functions (SECURITY DEFINER)             │
│  - Identity resolution                                 │
│  - Health-data access checks                           │
│  - Privileged admin operations                         │
│  - Audit logging triggers                              │
│                                                        │
│  Supabase Realtime                                     │
│  - Notification delivery                               │
│  - Appointment status changes                          │
│  - RLS-filtered subscriptions                          │
│                                                        │
│  Supabase Storage                                      │
│  - Public bucket: tenant logos, branding assets         │
│  - Private bucket: documents, uploads                   │
│  - Restricted bucket: health data files                 │
│    (stricter policies, separate access logging)         │
│                                                        │
│  pg_cron (Supabase extension)                          │
│  - Expiry checks (entitlements, grants, trials)        │
│  - Scheduled reminders                                 │
│  - Aggregate/summary computation                       │
│                                                        │
├────────────────────────────────────────────────────────┤
│  FUTURE: Cloudflare Workers                            │
│  - Static asset hosting (Vite build output)            │
│  - Edge middleware (rate limiting, geo-routing)         │
│  - NOT the API runtime (Supabase is the API)           │
└────────────────────────────────────────────────────────┘
```

### 7.2 Operation Classification

| Class | Runtime | Auth | Example |
|---|---|---|---|
| **User read** | PostgREST + RLS | anon key + JWT | List my appointments |
| **User write** | PostgREST + RLS | anon key + JWT | Log a meal entry |
| **Complex user op** | Edge Function | JWT verified server-side | Book appointment (concurrency check) |
| **Privileged admin op** | Edge Function → DB function | JWT + role check + audit log | Investigate health record |
| **Background job** | pg_cron → DB function | Service role (internal only) | Expire stale entitlements |
| **External integration** | Edge Function | JWT + API key (vault) | Charge via Razorpay |

### 7.3 Secret Management

| Secret | Storage | Access |
|---|---|---|
| Supabase anon key | `.env` / Vite env var | Browser (public, safe with RLS) |
| Supabase service_role key | Supabase Vault / Edge Function env | Server-side only. Never in browser. |
| Payment gateway keys | Supabase Vault | Edge Functions only |
| Email/SMS API keys | Supabase Vault | Edge Functions only |
| MFA secret seeds | `auth.users` (Supabase-managed) | Supabase Auth internal |

### 7.4 Cloudflare Workers Compatibility

The React frontend is a static SPA built by Vite. Cloudflare Workers serves only static assets. All API calls go to Supabase directly from the browser (PostgREST) or through Supabase Edge Functions. This means:
- No Cloudflare-specific server code for business logic
- No D1, R2, KV, or Durable Objects
- Workers may add edge middleware later (rate limiting, bot protection, geo-redirect)
- All business logic remains portable — Supabase is the sole backend

---

## 8. Module Ownership Matrix (Summary)

See [MODULES.md](MODULES.md) for full specifications.

### Layer 1 — Platform Control Plane (11 modules)

| ID | Module | Phase |
|---|---|---|
| P01 | Platform Auth & Identity | 1 |
| P02 | Tenant Management | 1 |
| P03 | Branch Management | 1 |
| P04 | Industry Registry | 2 |
| P05 | Module Registry | 2 |
| P06 | Entitlement Engine | 2 |
| P07 | Support Delegation | 1 |
| P08 | Platform Billing | Later |
| P09 | White-Label Engine | 3 |
| P10 | Feature Flags & Quotas | 2 |
| P11 | Audit & Security | 1 |

### Layer 2 — Shared Business Core (11 modules)

| ID | Module | Phase |
|---|---|---|
| C01 | Native CRM Foundation | 4A |
| C02 | Calendar & Scheduling | 4B |
| C03 | Staff & HR Core | 5 |
| C04 | Finance Core | 5 |
| C05 | Notification Engine | 5 |
| C06 | Document Management | 4A |
| C07 | Workflow Engine | 6 |
| C08 | AI Infrastructure | 6 |
| C09 | Analytics & BI Core | 5 |
| C10 | Tags & Metadata | 2 |
| C11 | Dynamic Vocabulary | 2 |

### Layer 3 — WellnessOS (24 modules + 10 add-ons)

| ID | Module | Phase |
|---|---|---|
| W01 | Wellness Dashboard | 4H |
| W02 | Lead Generation | 4A |
| W03 | Lead Management | 4A |
| W04 | Consultations & Appointments | 4B |
| W05 | Client Registration & 360° | 4A |
| W06 | Health Screening & Assessment | 4D |
| W07 | Weight & Body Progress | 4E |
| W08 | Goals & Care Plans | 4F |
| W09 | Nutrition & Meal Planning | 4G |
| W10 | Activity & Fitness Coaching | 5 |
| W11 | Habits & Lifestyle | 5 |
| W12 | Programs & Packages | 4C |
| W13 | Client Portal / PWA | 5 |
| W14 | AI Wellness Workforce | 6 |
| W15 | Automation & Engagement | 6 |
| W16 | Practitioner Workspace | 5 |
| W17 | Staff & HR Operations | 5 |
| W18 | Finance & Billing | 5 |
| W19 | Product & Commerce | Later |
| W20 | Progress Reviews & Outcomes | 5 |
| W21 | Community & Challenges | Later |
| W22 | Reports & BI | 5 |
| W23 | Multi-Branch & Franchise | 5 |
| W24 | Settings & Integrations | 4A |
| WX01–WX10 | Optional add-ons | 7 |

---

## 9. Development Sequence (Correction #8)

### Phase 0 (NOW) — Architecture Blueprint
**Exit:** Owner approves this document.

### Phase 1 — Foundation
**Scope:** Git/build setup, Supabase dev project, identity model, auth, Super Admin, tenants, branches, memberships, support delegation, audit logging.  
**Exit:** See Section 12 (Phase 1 Acceptance Criteria).

### Phase 2 — Module Engine
**Scope:** Industry Registry, Module Registry, entitlement state machine, tags, vocabulary, feature flags.  
**Exit:** Module enable/disable works with dependency checks; revoked entitlement denies access server-side.

### Phase 3 — White-Label & Navigation
**Scope:** Tenant branding, role-based sidebar, customer portal shell, environment config.  
**Exit:** Each tenant renders own branding; navigation computed from entitlements + role.

### Phase 4 — Wellness Core (8 milestones)

| Sub | Scope | Dependencies | Exit Criteria |
|---|---|---|---|
| **4A** | Client identity: contacts, wellness_clients, coach_assignments, document management, lead gen/mgmt, settings | Phase 1 auth/tenants | Contact created, wellness profile linked, practitioner assigned, document uploaded |
| **4B** | Appointments: services, availability, bookings, reminders | 4A (contacts) | Practitioner creates service, client books, reminder sent, status transitions work |
| **4C** | Programs & enrollment: wellness_programs, wellness_enrollments, session credits | 4A (contacts). Uses interim payment interface (Section 10). | Program created, client enrolled, session credits tracked, pause/resume works |
| **4D** | Health assessment & screening: intake, medical history, allergies, medications | 4A (contacts + coach_assignments for access control) | Assessment created by practitioner, only assigned practitioner can read, client sees own |
| **4E** | Weight & body progress: measurements, trends, BMI calculation | 4A (contacts), 4D (assessment baseline) | Measurement recorded, trend computed, chart data API works |
| **4F** | Goals & care plans: goals, versioned plans, professional approval | 4A, 4D (assessment informs plan) | Plan created, version saved, approval workflow, client sees approved version only |
| **4G** | Nutrition & meal planning: food items, recipes, meal plans, diary | 4A (contacts) | Meal plan built from food DB, assigned to client, client logs diary entries |
| **4H** | End-to-end integration test + dashboard | 4A–4G complete | Synthetic client journey: register → assess → enroll → plan → measure → log meals → review |

### Phase 5 — Wellness Operations
**Scope:** Practitioner workspace, fitness/activity, habits, client PWA, finance core, reports, staff, multi-branch, progress reviews.  
**Exit:** Full booking → plan → progress → review cycle works.

### Phase 6 — AI & Automation
**Scope:** Knowledge controls, AI agents, workflow events, human escalation, usage metering.  
**Exit:** AI cannot bypass clinical approvals or tenant isolation.

### Phase 7 — Add-Ons
**Scope:** Home visits, partner network, commissions, device sync, video consults, etc.  
**Exit:** Each add-on independently controlled by entitlement.

### Phase 8 — CRM Connector
**Scope:** Mock adapter, mapping config, idempotent sync, failure/retry.  
**Exit:** System works identically with CRM disconnected.

### Phase 9 — QA & Pilot
**Scope:** E2E tests, security review, recovery rehearsal, pilot deployment.  
**Exit:** Explicit owner go-live approval.

---

## 10. Enrollment/Finance Decoupling (Correction #9)

Programs & enrollment (Phase 4C) ships before Finance Core (Phase 5). To avoid a hard dependency:

### Interim Payment Status Interface

```sql
-- On wellness_enrollments:
enrollment_payment_status TEXT NOT NULL DEFAULT 'not_required'
  CHECK (enrollment_payment_status IN (
    'not_required',    -- free program or payment deferred
    'pending',         -- awaiting payment (manual tracking)
    'paid',            -- confirmed paid (manually or via finance)
    'partial',         -- installment in progress
    'overdue',         -- past due date
    'refunded'         -- fully refunded
  ))

enrollment_payment_notes TEXT  -- free-text for manual payment tracking
enrollment_payment_ref   TEXT  -- external reference (receipt number, UPI ref, etc.)
```

**Rules:**
- In Phase 4C, payment status is managed manually by tenant admin/practitioner.
- Enrollment can proceed regardless of payment status (configurable per program: `wellness_programs.requires_payment BOOLEAN DEFAULT false`).
- When Finance Core (Phase 5) ships, `invoices` links to `wellness_enrollments.id`. The `enrollment_payment_status` is then updated automatically by invoice status changes via a trigger.
- Interim fields (`payment_notes`, `payment_ref`) remain for backward compatibility and manual overrides.

---

## 11. Integration Gateway (Layer 5)

```
┌───────────────────────────────────────┐
│  Integration Gateway                  │
│                                       │
│  ┌─────────────────────────────┐      │
│  │ CRM Adapter (disabled/mock) │      │
│  │ - Contact sync interface    │      │
│  │ - Appointment sync          │      │
│  │ - Payment reference sync    │      │
│  │ - Webhook in/out            │      │
│  └─────────────────────────────┘      │
│                                       │
│  ┌─────────────────────────────┐      │
│  │ Payment Adapter (TBD)       │      │
│  │ - Razorpay (proposed)       │      │
│  │ - Webhook verification      │      │
│  └─────────────────────────────┘      │
│                                       │
│  ┌─────────────────────────────┐      │
│  │ Messaging Adapter (TBD)     │      │
│  │ - Email (Resend proposed)   │      │
│  │ - SMS (MSG91 proposed)      │      │
│  │ - WhatsApp (via MSG91)      │      │
│  └─────────────────────────────┘      │
│                                       │
│  All adapters:                        │
│  - Configurable per tenant            │
│  - Fail gracefully                    │
│  - System works without them          │
│  - Audit logged                       │
└───────────────────────────────────────┘
```

---

## 12. Phase 1 Acceptance Criteria (Correction #10)

### Positive Tests
- [ ] Super Admin can create tenant, add branch, invite member
- [ ] Tenant Admin can manage own tenant config within authorized scope
- [ ] Practitioner can log in and see empty workspace scoped to assigned branch
- [ ] Customer can log in and see empty portal scoped to own data
- [ ] Support delegation grant/revoke lifecycle works end-to-end
- [ ] Audit log captures all privileged operations with actor, tenant, timestamp

### Negative Tests — Cross-Tenant Isolation
- [ ] Tenant A user cannot SELECT from Tenant B's data via PostgREST
- [ ] Tenant A user cannot INSERT into Tenant B's tables via PostgREST
- [ ] Tenant A user cannot reference Tenant B's branch_id in a foreign key
- [ ] Tenant A user cannot join across tenants in a single query
- [ ] Cross-tenant FK attack: INSERT with a valid UUID from another tenant is denied by RLS + FK constraint with tenant-scoped uniqueness

### Negative Tests — Branch Access
- [ ] User assigned to Branch X cannot read data scoped to Branch Y
- [ ] Removing branch_assignment immediately denies access to that branch's data

### Negative Tests — Health Data (schema readiness verified in Phase 1)
- [ ] Unauthenticated request to health tables returns 401
- [ ] Authenticated user with no assignment to client gets zero rows from health tables
- [ ] Staff role (non-practitioner) gets zero rows from health tables
- [ ] Tenant Admin direct SELECT on health_assessments returns zero rows (must use privileged function)

### Negative Tests — Client Identity
- [ ] Contact without auth_user_id cannot authenticate
- [ ] Customer-role user cannot access another customer's contact record
- [ ] Customer cannot escalate to practitioner or tenant_admin role
- [ ] Linking a contact to auth_user_id requires matching tenant_memberships row

### Negative Tests — Privilege Escalation
- [ ] Support member with no active grant cannot change entitlements
- [ ] Support member cannot self-grant (grantee ≠ grantor enforced at DB level)
- [ ] Support member cannot self-approve action requests (reviewer ≠ requester enforced)
- [ ] Support grant for Tenant A / Module X fails on Tenant B / Module Y
- [ ] Expired grants are denied (query checks expires_at < now())
- [ ] Revoked grants are denied immediately, even if expires_at is in the future
- [ ] Tenant Admin cannot assign restricted modules or modify platform-level settings
- [ ] Non-super_admin user cannot create delegation grants
- [ ] Revoking a grant prevents all future use, including queued/pending requests

### Negative Tests — Delegation
- [ ] Delegation with past expires_at is rejected at creation
- [ ] NULL expires_at is rejected at creation (CHECK constraint)
- [ ] Delegation with grantee = grantor is rejected (CHECK constraint)

---

## 13. Project Structure

```
uniklife_master_dev/
├── CLAUDE.md
├── LOGBOOK.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .env.example
├── .gitignore
│
├── docs/
│   ├── ARCHITECTURE_v2.md      ← This file (v0.3.0)
│   ├── DATABASE.md             ← Full ERD and constraints
│   ├── SECURITY.md             ← Authorization model detail
│   ├── MODULES.md              ← Module specifications
│   ├── PRD.md                  ← Product requirements
│   ├── CRM_ANALYSIS.md         ← Existing CRM reference
│   └── DESIGN_SYSTEM.md        ← TBD
│
├── supabase/
│   ├── config.toml
│   ├── migrations/             ← Version-controlled SQL
│   ├── seed/                   ← Dev/demo synthetic data
│   └── functions/              ← Edge Functions (Deno)
│
├── src/
│   ├── lib/                    ← Supabase client, auth, utils
│   ├── types/                  ← Shared TypeScript types
│   ├── hooks/                  ← useAuth, useTenant, useModuleAccess
│   ├── components/             ← UI components (shadcn/ui)
│   ├── platform/               ← Layer 1: Control Plane
│   ├── core/                   ← Layer 2: Shared Business Core
│   ├── verticals/wellness/     ← Layer 3: WellnessOS modules
│   └── experiences/            ← Layer 4: Role-specific UIs
│
├── public/
└── tests/
```

---

## 14. Open Decisions

| # | Decision | Status |
|---|---|---|
| 1 | Payment provider (India) | PENDING — Razorpay proposed |
| 2 | Email provider | PENDING — Resend proposed |
| 3 | SMS/WhatsApp (India) | PENDING — MSG91 proposed |
| 4 | Supabase region | PENDING — Mumbai (ap-south-1) if available |
| 5 | Product name | PENDING — WellnessOS for vertical; UNIKLIFE.AI for platform |

---

## 15. Technical Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Supabase free tier limits | Row/storage/bandwidth caps | Monitor; upgrade before demo |
| RLS policy complexity | ~60+ tables need correct policies | Template-based generation; automated tests; identity helper functions |
| Edge Function cold starts | First request after idle is slow | Keep functions small; warm via pg_cron ping if needed |
| Module entitlement cache | Stale cache = unauthorized access | Bust on change; server re-check on every privileged operation |
| Health data compliance | Indian law (DPDPA 2023) applies | Legal review before real patient data; consent tracking built in |
| Food database size | Indian/Telugu food library is large | Curated initial set; community contributions later |
| Assignment-based RLS perf | Joins through coach_assignments on every health query | Index on (tenant_id, client_id, practitioner_id, status); materialized cache if needed |

---

*This document is a PROPOSED DESIGN. No code, infrastructure, or migrations will be created until the owner approves Phase 1.*

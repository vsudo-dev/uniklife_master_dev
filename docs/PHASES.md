# UNIKLIFE.AI — Development Phases

**Last updated:** 2026-11-06

---

## Phase 0 — Architecture Blueprint ✅ COMPLETED

| # | Task | Status |
|---|------|--------|
| 0.1 | Existing CRM analysis | ✅ Done |
| 0.2 | PRD & product vision | ✅ Done |
| 0.3 | Architecture v0.3.0 (10 corrections applied) | ✅ Done |
| 0.4 | Database schema — 52 tables, full constraints | ✅ Done |
| 0.5 | Security model & threat model | ✅ Done |
| 0.6 | Module catalog — 56 modules | ✅ Done |
| 0.7 | Tech stack finalized | ✅ Done |

**Exit criterion:** Owner approves architecture document — **APPROVED 2026-10-28**

---

## Phase 1 — Foundation ✅ COMPLETED

### Infrastructure

| # | Task | Status |
|---|------|--------|
| 1.01 | Project scaffolding (Vite 8 + React 19 + TS 6 + Tailwind v4) | ✅ Done |
| 1.02 | Supabase project linked (ap-south-1, PostgreSQL 17) | ✅ Done |
| 1.03 | Environment config (.env, gitignored) | ✅ Done |
| 1.04 | Supabase client library (`src/lib/supabase.ts`) | ✅ Done |
| 1.05 | Utility library (`src/lib/cn.ts`) | ✅ Done |

### Database & Auth

| # | Task | Status |
|---|------|--------|
| 1.06 | Phase 1 migration — 11 tables, RLS on all | ✅ Done |
| 1.07 | 5 identity resolution functions (public schema) | ✅ Done |
| 1.08 | Audit triggers on key tables | ✅ Done |
| 1.09 | Auto-create platform_users trigger | ✅ Done |
| 1.10 | Super Admin auto-promotion trigger | ✅ Done |
| 1.11 | Add auto-promotion SQL to migration file | ✅ Done |

### Auth UI & State

| # | Task | Status |
|---|------|--------|
| 1.12 | Login page (email/password) | ✅ Done |
| 1.13 | Signup page (email/password + full name) | ✅ Done |
| 1.14 | Auth state management (Zustand store) | ✅ Done |
| 1.15 | Auth listener (session + membership fetch) | ✅ Done |
| 1.16 | Auth gate (redirect unauthenticated) | ✅ Done |
| 1.17 | Loading screen | ✅ Done |
| 1.18 | Super Admin login verified | ✅ Done |

### TypeScript Types

| # | Task | Status |
|---|------|--------|
| 1.19 | Auth types (PlatformRole, TenantRole, etc.) | ✅ Done |
| 1.20 | Tenant types (Tenant, Branch, BranchAssignment) | ✅ Done |
| 1.21 | Delegation types (SupportPermissionGrant, etc.) | ✅ Done |

### App Shell

| # | Task | Status |
|---|------|--------|
| 1.22 | Dashboard shell with sidebar | ✅ Done |
| 1.23 | Super Admin dashboard (overview stats) | ✅ Done |

### Tenant Management

| # | Task | Status |
|---|------|--------|
| 1.24 | List tenants page | ✅ Done |
| 1.25 | Create tenant form | ✅ Done |
| 1.26 | Edit tenant | ✅ Done |
| 1.27 | Tenant detail view | ✅ Done |

### Branch Management

| # | Task | Status |
|---|------|--------|
| 1.28 | List branches (per tenant) | ✅ Done |
| 1.29 | Create branch form | ✅ Done |
| 1.30 | Edit branch | ✅ Done |

### Membership Management

| # | Task | Status |
|---|------|--------|
| 1.31 | List tenant members | ✅ Done |
| 1.32 | Invite / add member | ✅ Done |
| 1.33 | Change member role | ✅ Done |
| 1.34 | Remove member | ✅ Done |

### Branch Assignments

| # | Task | Status |
|---|------|--------|
| 1.35 | Assign member to branch | ✅ Done |
| 1.36 | Remove branch assignment | ✅ Done |
| 1.37 | View branch roster | ✅ Done |

### Support Delegation

| # | Task | Status |
|---|------|--------|
| 1.38 | Grant delegation form | ✅ Done |
| 1.39 | List active/expired grants | ✅ Done |
| 1.40 | Revoke delegation | ✅ Done |
| 1.41 | Action request submit/approve/deny | ✅ Done |

### Audit & Logging

| # | Task | Status |
|---|------|--------|
| 1.42 | Audit log viewer (filterable) | ✅ Done |
| 1.43 | Privileged operation log viewer | ✅ Done |

### Phase 1 Acceptance Tests

| # | Task | Status |
|---|------|--------|
| 1.44 | Positive tests (6 scenarios) | ✅ 6/6 Pass |
| 1.45 | Cross-tenant isolation tests (5 scenarios) | ✅ 5/5 Pass |
| 1.46 | Branch access tests (2 scenarios) | ✅ 2/2 Pass |
| 1.47 | Health data schema readiness tests (4 scenarios) | ✅ 4/4 Pass |
| 1.48 | Client identity tests (2 scenarios tested in Phase 1) | ✅ 2/2 Pass |
| 1.49 | Privilege escalation tests (4 scenarios) | ✅ 4/4 Pass |
| 1.50 | Delegation constraint tests (3 scenarios) | ✅ 3/3 Pass |

**Exit criterion:** All acceptance tests pass — **25/25 PASSED (2026-10-29)**

**Note:** During testing, N9 (cross-tenant branch assignment) initially failed — the `branch_assign_insert` RLS policy did not validate that branch and membership belong to the same tenant. Fixed in migration `20261029_002_fix_branch_assign_policy.sql`.

---

## Phase 2 — Module Engine ✅ COMPLETED

| # | Task | Status |
|---|------|--------|
| 2.1 | Industry Registry (industry_profiles table + 5 industries seeded + UI) | ✅ Done |
| 2.2 | Module Registry (global_modules table + 56 modules seeded + UI) | ✅ Done |
| 2.3 | Entitlement state machine (PENDING→ACTIVE→SUSPENDED→DISABLED→EXPIRED) | ✅ Done |
| 2.4 | Tenant module entitlements CRUD (assign/activate/suspend/disable + UI) | ✅ Done |
| 2.5 | Dependency validation on enable/disable (validate_module_dependencies + check_module_dependents) | ✅ Done |
| 2.6 | Tags & vocabulary system (tag_definitions, entity_tags, tenant_vocabulary tables + RLS) | ✅ Done |
| 2.7 | Feature flags (tenant_feature_settings table + RLS) | ✅ Done |
| 2.8 | Phase 2 acceptance tests (29 scenarios) | ✅ 29/29 Pass |

**Exit criterion:** Module enable/disable works with dependency checks; revoked entitlement denies access server-side — **29/29 PASSED (2026-10-29)**

---

## Phase 3 — White-Label & Navigation ✅ COMPLETED

| # | Task | Status |
|---|------|--------|
| 3.1 | Tenant branding CRUD (logo, colors, domain, sidebar gradient, emails) | ✅ Done |
| 3.2 | Role-based sidebar navigation (nav-config.ts, computed from role + active entitlements) | ✅ Done |
| 3.3 | Customer portal shell (separate layout for customer role) | ✅ Done |
| 3.4 | Environment config (Vite env vars, .env gitignored — already in place from Phase 1) | ✅ Done |
| 3.5 | Tenant shell (TenantShell with branding-aware sidebar) | ✅ Done |
| 3.6 | Route structure (/t/* for tenant users, /portal/* for customers) | ✅ Done |
| 3.7 | Reusable ShellLayout component (supports custom branding colors) | ✅ Done |

**Exit criterion:** Each tenant renders own branding; navigation computed from entitlements + role — **PASSED (2026-10-29)**

---

## Phase 4 — Wellness Core ✅ COMPLETED

| Sub | Scope | Status |
|-----|-------|--------|
| 4A | Client identity, contacts, coach assignments, documents | ✅ Done |
| 4B | Appointments: services, availability, bookings | ✅ Done |
| 4C | Programs & enrollment, session credits (interim payment) | ✅ Done |
| 4D | Health assessment & screening | ✅ Done |
| 4E | Weight & body progress, trends, BMI | ✅ Done |
| 4F | Goals & care plans, versioning, approval | ✅ Done |
| 4G | Nutrition & meal planning, food DB, diary | ✅ Done |
| 4H | UI — Clients list + Client detail (6 tabs) | ✅ Done |

**Exit criterion:** Migration deployed, RLS enforced, UI complete — **PASSED 2026-10-30**

---

## Phase 5 — Wellness Operations ✅ COMPLETED

| Milestone | Scope | Status |
|-----------|-------|--------|
| 5A | Practitioner workspace — daily schedule, client queue, quick notes | ✅ Done |
| 5B | Finance Core — invoices, line items, payments, revenue stats | ✅ Done |
| 5C | Staff management — roles, job titles, branch assignment, status | ✅ Done |
| 5D | Reports & analytics — revenue KPIs, wellness KPIs, program outcomes | ✅ Done |
| 5E | Multi-branch operations — branch cards with appointment + staff counts | ✅ Done |
| 5F | Progress reviews — check-ins (pending/complete, mood score), goal tracking (create, update status, progress bar) | ✅ Done |

---

## Phase 6 — Customer Portal ✅ COMPLETE (pending E2E test)

> v8.0.0–v8.2.0 built. Exit criterion: real client login test (6.9) pending owner verification.

Scope: Client-facing login, progress tracking, appointment booking, meal plan view, care plan view, habit check-ins, installable PWA

| # | Task | Status |
|---|------|--------|
| 6.1 | Home dashboard — vitals, programs, upcoming appointments | ✅ Done |
| 6.2 | Daily check-in widget (mood + notes) | ✅ Done |
| 6.3 | Progress page — measurement history + trend cards | ✅ Done |
| 6.4 | Appointments page — upcoming + past from CRM mirror | ✅ Done |
| 6.5 | My Health — assessment, care plan goals, meal plan | ✅ Done |
| 6.6 | Documents page — CRM documents with download | ✅ Done |
| 6.7 | PWA — manifest.json + meta tags | ✅ Done |
| 6.8 | Customer signup + auto-link (link_customer_account RPC + useAuthListener auto-link) | ✅ Done |
| 6.9 | Test with real client login — full E2E portal test | ⏳ Pending |
| 6.10 | Tenant-branded portal login page — /join/:slug shareable URL | ✅ Done |
| 6.11 | Support Team roster page (/users) — add/deactivate/remove members | ✅ Done |
| 6.12 | Create Grant dialog — dropdown from support team roster (replaces raw email) | ✅ Done |
| 6.13 | Login redirect fix — public auth routes (/auth/login, /auth/signup) redirect to "/" after success | ✅ Done |
| 6.14 | DashboardShell role guard — non-admin users redirected to correct shell, no sidebar leak | ✅ Done |
| 6.15 | Support team role promotion — add→support_ops, remove→tenant_user, requires update policy | ✅ Done |
| 6.16 | Full responsive overhaul — collapsible sidebar, mobile header, table scroll, dialog padding | ✅ Done |
| 6.17 | Smart collapsible sidebar — expanded/collapsed toggle, icon-only mode, tooltips, user avatar, localStorage persist | ✅ Done |
| 6.18 | Password visibility toggle — Eye/EyeOff on all password inputs across login, signup, portal, staff, reset pages | ✅ Done |
| 6.19 | Portal route guards — central config, shell guards (all 4 shells), login role validation, audit logging of blocked attempts | ✅ Done |
| 6.19 | Bug fix — support_ops blocked from platform admin routes; redirect to /support | ✅ Done |
| 6.20 | Bug fix — portal sidebar nav collision; login route changed from /portal/:slug to /join/:slug | ✅ Done |
| 6.21 | Smart delegation dialogs — permission config, action checkboxes on Create Grant, action dropdown on Submit Request | ✅ Done |
| 6.22 | Delegation workflow overhaul — grants grouped by grantee, inline approve/reject, Submit Request on Support Ops only, human labels | ✅ Done |
| 6.23 | Delegation polish — hide revoked/expired grants (Show history toggle), block duplicate active grants, legacy `tenant.membership` key label | ✅ Done |
| 6.24 | Delegation workflow security fix — Submit Request routes through `support-action` Edge Function; new `review-action` Edge Function auto-executes on approve; grants filtered to own user; payload column; stuck test data cleaned | ✅ Done |
| 6.25 | Bug fix — customer login blocked on `/portal`; admin-only sign-out now gated behind `isPublicRoute` | ✅ Done |

**Exit criterion:** A real client can log in, view their progress, book an appointment, and see their meal plan

---

## Phase 7 — Automations & Workflows ⏳ PENDING

Scope: Appointment reminders, post-session follow-ups, re-engagement alerts for inactive clients, milestone notifications

---

## Phase 8 — AI Layer ⏳ PENDING

Scope: AI wellness coach, smart meal plan suggestions, assessment analysis for practitioners, AI-assisted care plan drafts

---

## Phase 9 — Reporting & Analytics ⏳ PENDING

Scope: Wellness outcome dashboards, revenue trends, coach workload, program completion rates, client retention metrics

---

## Phase 10 — MyAppz CRM Integration ✅ COMPLETED

**This is the CRM Adapter phase — approved strategy as of 2026-11-02. See `docs/VISION_AND_STRATEGY.md`.**

Scope:
- [x] Build CRM Adapter layer at `src/lib/crm/` — `client.ts`, `types.ts`, `contacts.ts`, `appointments.ts`, `billing.ts`, `index.ts`
- [x] TanStack Query hooks — `use-crm-contacts.ts`, `use-crm-appointments.ts`, `use-crm-billing.ts`
- [x] Redirect Clients page to read from MyAppz `contacts` table
- [x] Redirect Appointments page to read from MyAppz `calendar_bookings` table
- [x] Redirect Billing page to read from MyAppz `invoices` + `payment_gateway_transactions` tables
- [x] ESLint config updated to allow `_` prefix for intentionally unused params
- [x] Paste `VITE_CRM_API_KEY` into `.env` and verify live data loads
- [x] Adjust table/column names if MyAppz schema differs — webhook-based mirror architecture adopted (no direct CRM table reads)
- [x] Redirect Documents to MyAppz `contact_documents`
- [x] Auth: password reset flow (/auth/reset page + forgot-password mode in login)
- [x] Frontend activity logger: log_user_activity() RPC + usePageView() hook — page views in audit_logs
- [x] Audit log redesign: 3 tabs (All/System/User), filters (role/entity/date), inline Details, actor name, 90-day cleanup cron
- [x] Nav fix: each role sees only their own UI — tenant shell context param added to getNavForRole()
- [x] Tenant slug URLs: /t/:slug/* routing — migration (slug column), useTenantBySlug hook, TenantContext, dynamic nav hrefs — URLs like /t/healthy-fitness/dashboard
- [x] Documents page → MyAppz contact_documents (CrmDocument type, getCrmDocuments adapter, useCrmDocuments hook, DocumentsPage)
- [x] Support Ops shell: /support/ route — SupportShell, SupportHome (grant overview + tenant cards), SupportDelegationsPage, SupportRequestsPage (approve/reject inline)
- Campaigns, automations, courses, community — handled fully by MyAppz, no UI change needed
- [x] CRM mirror tables live: crm_appointments + crm_invoices (migration 20261110) — webhook-synced, RLS enforced
- [x] Appointments page reads from crm_appointments mirror; Client name column via contacts join ✅
- [x] Billing page reads from crm_invoices mirror ✅
- [x] Platform→CRM write-back Edge Function (crm-sync-contact) deployed — deferred activation pending contact creation UI
- [x] Our Supabase CRM mirror tables (contacts, appointments, invoices) go idle — not deleted
- Wellness tables (health, care plans, nutrition, workspace) stay in our Supabase — no change
- [x] CRM contact tag filter: crm_contact_tag on tenants; webhook skips untagged contacts (migration 20261111)
- [x] CRM tag strict/safe mode toggle: crm_tag_strict_mode on tenants + UI toggle in Settings (migration 20261112)
- [x] Client detail: CRM contact as primary layer, wellness_clients as optional layer, Activate Wellness Profile button
- [x] Client profile status management: Suspend / Deactivate / Reactivate buttons (migration 20261113)
- [x] Client profile Invoices tab (8th tab) — CRM invoices per contact
- [x] SOP documentation: 30-file docs/sop/ library + PENDING_CODE_CHANGES.md

**Exit criterion:** UI reads CRM data from MyAppz with real API key. Our Supabase wellness layer still works independently. ✅ COMPLETE 2026-11-06

---

## Phase 11 — Add-Ons ⏳ PENDING

Scope: Home visits, partner network, commissions, device sync, video consults

---

## Phase 12 — QA & Pilot ⏳ PENDING

Scope: E2E tests, security review, recovery rehearsal, pilot deployment

**Exit criterion:** Explicit owner go-live approval

---

## Phase 13 — Own CRM (Long Term) ⏳ FUTURE

**This is the full independence phase. See `docs/VISION_AND_STRATEGY.md` Stage 3.**

Scope:
- Build our own CRM from scratch — contacts, pipelines, bookings, campaigns, email/SMS, automations, courses, community
- Once complete, swap the CRM Adapter (from Phase 10) to point to our own CRM instead of MyAppz
- Disconnect MyAppz entirely
- UI pages require zero changes — adapter pattern absorbs the swap
- We own the entire stack top to bottom

**Exit criterion:** All CRM features working on our own platform. MyAppz dependency removed. Owner approves full migration.

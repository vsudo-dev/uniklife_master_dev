<!--
  PROJECT IDENTITY GUARD
  ----------------------
  Project  : UNIKLIFE.AI — Multi-tenant Wellness SaaS Platform
  Repo path: /Users/venkatesh/Desktop/prod/uniklife_master_dev
  Owner    : Venkatesh (uniklife01@gmail.com)

  BEFORE WRITING ANY ENTRY: verify this file belongs to the project
  you are currently working in. Check the repo path above against
  your working directory. If they do not match, STOP — you are in
  the wrong project's VERSION_HISTORY.md.

  PURPOSE: Quick-reference version table. One row per release.
  Full details (migrations, hooks, bugs, decisions) stay in LOGBOOK.md.

  FORMAT FOR NEW ROWS:
  | vX.Y.Z | YYYY-MM-DD HH:MM IST | Phase N — Name | One-line summary |
-->

# UNIKLIFE.AI — Version History

> Full details for each version: see [LOGBOOK.md](LOGBOOK.md)

---

## Summary Table

| Version | Date & Time (IST) | Phase | What Was Built |
|---------|-------------------|-------|----------------|
| v0.0.1 | 2026-10-28 14:00 | Phase 0 — Architecture Blueprint | Project init — git, CLAUDE.md, docs/ARCHITECTURE.md, Supabase folder structure |
| v0.1.0 | 2026-10-28 15:30 | Phase 0 — Architecture Blueprint | CRM analysis — docs/CRM_ANALYSIS.md, 1,967-table MyAppz mapping |
| v0.2.0 | 2026-10-28 16:00 | Phase 0 — Architecture Blueprint | Architecture v2 — 5-layer design, 5-tier user hierarchy, 56-module catalog, RLS strategy |
| v0.3.0 | 2026-10-28 17:30 | Phase 0 — Architecture Blueprint | 10 owner corrections applied — identity chain, health-data access, support delegation, backend runtime |
| v1.0.0 | 2026-10-29 ~20:00 | Phase 1 — Foundation | Full foundation: 11 DB tables + RLS, auth UI, tenant/branch/member CRUD, delegation, audit log — 25/25 tests PASSED |
| v2.0.0 | 2026-10-29 ~22:00 | Phase 2 — Module Engine | 8 tables, 56 modules seeded, entitlement state machine, dependency validation — 29/29 tests PASSED |
| v3.0.0 | 2026-10-29 ~23:00 | Phase 3 — White-Label & Navigation | 3 shell layouts, role-based nav, branding CRUD, tenant settings page |
| v4.0.0 | 2026-10-30 ~20:00 | Phase 4 — Wellness Core | 23 tables: contacts, health assessments, body progress, care plans, nutrition, meal plans — client list + 6-tab client detail UI |
| v5.1.0 | 2026-11-02 ~15:00 | Phase 5B — Finance Core | Invoices, line items, payments, revenue dashboard, invoice detail + record payment |
| v5.2.0 | 2026-11-02 ~18:00 | Phase 5A — Practitioner Workspace | Daily schedule timeline, client queue, quick notes, auto-refresh every 60s |
| v5.3.0 | 2026-11-04 ~15:30 | Phase 5C — Staff Management | Staff table, inline edit profile (job title, branch, status, specialization, hire date) |
| v5.4.0 | 2026-11-04 ~16:00 | Phase 5D — Reports & Analytics | Revenue KPIs, wellness KPIs, program enrollment outcomes with completion rate bars |
| v5.5.0 | 2026-11-04 ~16:30 | Phase 5E — Multi-Branch Operations | Branch overview cards with live appointment + staff count stats |
| v5.6.0 | 2026-11-04 ~17:00 | Phase 5F — Progress Reviews | Check-ins (pending/complete, mood 1–5) + goal tracking (create, status transitions, progress bars) |
| v5.7.0 | 2026-11-04 ~18:00 | Phase 1 close-out | Support Ops migration: expire_stale_grants() + pg_cron hourly job + validate_support_grant() RPC |
| v6.0.0 | 2026-11-05 14:30 IST | Phase 10 — CRM Adapter | CRM Adapter layer: src/lib/crm/ (client, types, contacts, appointments, billing), 3 TanStack Query hooks, Clients/Appointments/Billing pages rewired to MyAppz — lint+typecheck PASSED |
| v6.1.0 | 2026-11-05 12:30 IST | Auth close-out | Password reset flow: forgot-password mode in login page + /auth/reset page (PASSWORD_RECOVERY handler) + public route outside AuthGate |
| v6.2.0 | 2026-11-05 13:00 IST | Audit enhancement | Frontend activity logger: log_user_activity() RPC + usePageView() hook — page views now captured in audit_logs alongside DB trigger events |
| v6.3.0 | 2026-11-05 15:30 IST | Audit log redesign | 3-tab view (All/System/User), filter bar (role/entity/date), inline Details expand, actor name column, 90-day auto-cleanup cron |
| v6.4.0 | 2026-11-05 16:30 IST | Audit bug fix | Fixed log_audit_event() trigger never setting actor_role (always NULL); backfill applied; role filter now works |
| v6.5.0 | 2026-11-05 17:30 IST | Nav fix | Fixed tenant shell showing Platform Nav for super_admin; added context param to getNavForRole(); each role now sees only their own UI |
| v6.6.0 | 2026-11-05 19:30 IST | Tenant slug URLs | /t/:slug/* routing — slug column on tenants (migration), slug map in auth store, useTenantBySlug hook, TenantContext, dynamic nav hrefs |
| v6.8.0 | 2026-11-05 22:00 IST | Bug fix — entitlement activation | Fixed stale React mutation error on module Activate button: `transition.reset()` before each `mutate()` clears prior error state |
| v6.9.0 | 2026-11-05 23:30 IST | CRM Webhook integration | Replaced CRM API pull with webhook push: crm-webhook Edge Function, migration 20261109_001_crm_webhook_mapping.sql (crm_contact_id + crm_location_id columns), CRM workflows configured — contacts sync on create/update |
| v7.0.0 | 2026-11-06 12:00 IST | Phase 10 — CRM Step 1 complete | Mirror tables crm_appointments + crm_invoices; webhook extended for appointment/invoice events; Appointments + Billing pages read from mirror tables; Client name column on Appointments; Platform→CRM write-back Edge Function (crm-sync-contact) |
| v7.1.0 | 2026-11-06 13:00 IST | Phase 5 UI Polish | Dashboard today's appts → crm_appointments; Reports revenue → crm_invoices; Branches removed broken appointment count; Staff edit form now inline below row |
| v7.2.0 | 2026-11-06 14:00 IST | Client Detail — CRM contact + wellness split | Contact loads from contacts table (primary); wellness_clients is optional layer; no profile → "Activate Wellness Profile" card + CRM appointments; with profile → full 7-tab view |
| v7.3.0 | 2026-11-06 15:00 IST | CRM contact tag filter | crm_contact_tag column on tenants; webhook skips contacts missing the tag; healthy-lifestyle set to test_healthy-fitness; deployed migration + function |
| v7.4.0 | 2026-11-06 17:00 IST | Documentation | 30-file SOP library in docs/sop/ + PENDING_CODE_CHANGES.md at project root |
| v7.5.0 | 2026-11-06 18:00 IST | CRM tag strict/safe mode toggle | crm_tag_strict_mode on tenants, webhook uses flag, toggle UI in Settings; CRM bug workaround |
| v7.6.0 | 2026-11-06 19:00 IST | Client profile status + Invoices tab | Suspend/Deactivate/Reactivate buttons + 8th Invoices tab + enrollment_status CHECK constraint extended |
| v7.7.0 | 2026-11-06 20:00 IST | Bug fix — integer field validation | Log Measurements: BP/Resting HR fields now use step="1" + Math.round() to prevent decimal → INT DB error |
| v8.0.0 | 2026-11-06 21:30 IST | Phase 6 — Customer Portal | 4 portal pages (Progress, Appointments, Health, Documents) + daily check-in widget + PWA manifest |
| v8.1.0 | 2026-11-06 22:30 IST | Phase 6 — Customer auto-link | link_customer_account() RPC + auto-link in useAuthListener + friendly no-contact screen |
| v8.2.0 | 2026-11-06 23:30 IST | Super Admin — View As mode | Eye icon on Tenants + Clients; role picker; ViewModeBanner; portal contactId override |
| v8.3.0 | 2026-11-07 00:30 IST | Bug fix — View As routing | Exit returns to originating page (not /); each role lands on correct home page (workspace for practitioner, clients for staff) |
| v8.4.0 | 2026-11-07 01:00 IST | Tenant-branded portal login | /portal/:slug — shareable client entry point with tenant logo, colors, sign-in/sign-up/forgot-password |
| v8.5.0 | 2026-11-07 02:00 IST | Smart module activation | Tier picker on tenant creation (Starter/Standard/Professional/Enterprise), auto-resolve dep chain on Activate, Quick Setup bar, plain-English module table |
| v8.6.0 | 2026-11-07 03:00 IST | Branded staff login page | /login/:slug — team entry point with tenant branding; role-aware redirect (admin→dashboard, practitioner→workspace, staff→clients) |
| v8.8.0 | 2026-11-07 09:00 IST | Bug fix — port + role redirect | Fixed Vite port drift (vite.config.ts server.port=5173); fixed staff login redirect firing before activeRole loads |
| v8.9.0 | 2026-11-07 15:30 IST | Phase 6 — Support Team Roster | support_team_members table + /users page rebuilt with roster CRUD + Create Grant dialog now uses team dropdown |
| v8.9.2 | 2026-11-07 16:00 IST | Bug fix — Login redirect | Fixed: public auth routes (/auth/login, /auth/signup) did not redirect after successful login — added navigate("/") on public route success |
| v10.0.3 | 2026-11-08 04:00 IST | Bug fix — wellness profile activation | Fixed `onConflict: "contact_id"` → `"tenant_id,contact_id"` to match composite unique constraint; Phase 6 E2E test PASSED — all 5 portal pages + 8 admin tabs working |
| v10.0.2 | 2026-11-08 03:00 IST | Bug fix — contact auto-link guard | Removed `memberships.length === 0` guard so `link_customer_account()` RPC fires on every tenant_user login; fixes "Profile not linked" for customers whose CRM contact was added after first login |
| v10.0.1 | 2026-11-08 02:00 IST | Bug fix — customer portal login | LoginPage admin-only check was signing out customers on `/portal`; now only enforced on `/auth/*` public routes |
| v10.0.0 | 2026-11-08 01:30 IST | Delegation Workflow Security Fix | Submit Request now routes through `support-action` Edge Function (grant validation); new `review-action` Edge Function auto-executes on approve; grants filtered to own user; stuck test data cleaned; payload column added |
| v9.6.0 | 2026-11-08 00:30 IST | Delegation Polish | Hide revoked/expired grants by default (Show history toggle), block duplicate active grants (warning + disabled submit), legacy `tenant.membership` key now shows human label |
| v9.5.0 | 2026-11-07 23:30 IST | Delegation Workflow Overhaul | Grants grouped by grantee, inline approve/reject (no prompt()), Submit Request moved to Support Ops, human-readable labels |
| v9.4.0 | 2026-11-07 23:00 IST | Smart Delegation Dialogs | Permission config, Create Grant with action checkboxes, Submit Request with action dropdown — no more free-text guessing |
| v9.3.1 | 2026-11-07 22:00 IST | Bug fix — portal sidebar navigation | `/portal/:slug` login route collided with `/portal/*` authenticated routes; changed login to `/join/:slug` |
| v9.3.0 | 2026-11-07 21:00 IST | Portal Route Guards | Strict role-to-route isolation: central portal config, shell guards on all 4 shells, login page role validation, audit logging of blocked attempts |
| v9.2.1 | 2026-11-07 20:00 IST | Bug fix — support_ops route guard | support_ops users redirected to /support when accessing platform admin routes (/delegation, /tenants, etc.) — was showing Super Admin dashboard |
| v9.2.0 | 2026-11-07 19:30 IST | Password Visibility Toggle | Eye/EyeOff button on all password fields — login, signup, portal login, staff login, reset password (2 independent toggles) |
| v9.1.0 | 2026-11-07 18:30 IST | Smart Collapsible Sidebar | Desktop sidebar toggles expanded (256px) ↔ collapsed (72px icons-only + tooltips); user avatar initials; localStorage persistence; mobile overlay unchanged |
| v9.0.0 | 2026-11-07 17:00 IST | Full Responsive Overhaul | Responsive sidebar (hamburger on mobile, overlay + backdrop, auto-close on nav); table scroll; mobile padding; dialog padding; page header wrap — 50+ files updated |
| v8.7.0 | 2026-11-07 04:00 IST | Portal Links page | Super Admin sidebar — all platform + per-tenant URLs with Copy + Open buttons; role badges; active-first ordering |
| v6.7.0 | 2026-11-05 20:30 IST | Phase 10 close-out | Documents page → MyAppz contact_documents; Support Ops shell (/support/) with overview, delegations, action requests |

---

## Phase Completion Status

| Phase | Name | Status | Completed |
|-------|------|--------|-----------|
| Phase 0 | Architecture Blueprint | ✅ Complete | 2026-10-28 |
| Phase 1 | Foundation | ✅ Complete | 2026-10-29 |
| Phase 2 | Module Engine | ✅ Complete | 2026-10-29 |
| Phase 3 | White-Label & Navigation | ✅ Complete | 2026-10-29 |
| Phase 4 | Wellness Core | ✅ Complete | 2026-10-30 |
| Phase 5 | Wellness Operations (5A–5F) | ✅ Complete | 2026-11-04 |
| Phase 10 | MyAppz CRM Adapter | ✅ Complete | 2026-11-06 |
| Phase 6 | Customer Portal | 🔄 In Progress | — |
| Phase 7 | Automations & Workflows | ⏳ Pending | — |
| Phase 8 | AI Layer | ⏳ Pending | — |
| Phase 9 | Reporting & Analytics | ⏳ Pending | — |
| Phase 12 | QA & Pilot | ⏳ Pending | — |
| Phase 13 | Own CRM (Long Term) | 🔮 Future | — |

---

## Migration Log

| File | Applied | What It Does |
|------|---------|--------------|
| `20261028_001_phase1_foundation.sql` | 2026-10-28 | 11 platform tables, RLS, identity functions, auth triggers |
| `20261029_002_fix_branch_assign_policy.sql` | 2026-10-29 | Security fix: cross-tenant branch assignment RLS gap |
| `20261030_001_phase2_module_engine.sql` | 2026-10-29 | 8 module engine tables, 56 modules + 5 industries seeded |
| `20261031_001_phase4a_wellness_core.sql` | 2026-10-30 | 23 wellness tables (health, care plans, nutrition, programs) |
| `20261102_001_phase5b_finance_core.sql` | 2026-11-02 | invoice_items, payments, invoice_summary view |
| `20261103_001_phase5a_practitioner_workspace.sql` | 2026-11-02 | client_notes table with note types and privacy flag |
| `20261104_001_support_ops_infra.sql` | 2026-11-04 | expire_stale_grants(), pg_cron hourly job, validate_support_grant() RPC |
| `20261108_001_tenant_slug.sql` | 2026-11-05 | generate_tenant_slug() function, slug column on tenants (backfilled), unique index |
| `20261109_001_crm_webhook_mapping.sql` | 2026-11-05 | crm_contact_id + crm_location_id columns on contacts; webhook mapping support |
| `20261110_001_crm_mirror_tables.sql` | 2026-11-06 | crm_appointments + crm_invoices mirror tables |
| `20261111_001_tenant_crm_tag.sql` | 2026-11-06 | crm_contact_tag on tenants; set test_healthy-fitness for healthy-lifestyle |
| `20261112_001_crm_tag_strict_mode.sql` | 2026-11-06 | crm_tag_strict_mode BOOLEAN on tenants (default false = safe fallback) |
| `20261113_001_wellness_status_values.sql` | 2026-11-06 | Extended enrollment_status CHECK to include suspended + deactivated |
| `20261114_001_link_customer_account.sql` | 2026-11-06 | link_customer_account() RPC — links contacts.auth_user_id + creates customer membership on first login |
| `20261115_001_portal_config_rpc.sql` | 2026-11-07 | get_portal_config() public RPC — returns tenant name/logo/colors by slug for unauthenticated portal login page |
| `20261116_001_support_team_members.sql` | 2026-11-07 | support_team_members table with RLS — support roster for delegation workflow |
| `20261117_001_fix_support_team_rls.sql` | 2026-11-07 | Fix RLS — replace broken FOR ALL policy with per-operation policies using is_super_admin() |
| `20261118_001_super_admin_update_users.sql` | 2026-11-07 | Add users_update_super policy — super admin can update any platform_users row (needed for role promotion) |
| `20261119_001_action_request_payload.sql` | 2026-11-08 | Add payload JSONB column to support_action_requests + cleanup stuck SuperAdmin test rows |

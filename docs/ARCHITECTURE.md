# UNIKLIFE.AI — System Architecture

**Version:** 0.1.0  
**Date:** 2026-10-28  
**Status:** PROPOSED DESIGN — Pending owner approval  
**Phase:** Phase 0 — Architecture Blueprint

---

## 1. System Overview

UNIKLIFE.AI is an independently owned, multi-tenant, multi-industry, white-label SaaS Business Operating System. The platform separates concerns into five architectural layers so that adding a new industry vertical never requires rebuilding identity, billing, authorization, or core business services.

The first vertical is **WellnessOS** (Weight Loss & Wellness), comprising 24 core modules and 10 optional add-ons.

---

## 2. Architecture Pattern

**Pattern:** Modular Monolith with Bounded Contexts  
**Reason:** Single deployable unit reduces operational complexity at this stage. Clear module boundaries (enforced by folder structure, TypeScript module boundaries, and database schemas) prepare for future service extraction if needed. No premature microservices.

---

## 3. Technology Stack

| Layer | Technology | Status |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | CONFIRMED |
| UI Components | Accessible component library (TBD — shadcn/ui proposed) | PROPOSED |
| Backend | Modular TypeScript services via Supabase Edge Functions + client-side Supabase SDK | CONFIRMED |
| Database | Supabase PostgreSQL (hosted) | CONFIRMED |
| Auth | Supabase Auth (email/password, MFA for admins) | CONFIRMED |
| Storage | Supabase Storage (private buckets) | CONFIRMED |
| Future Hosting | Cloudflare Workers with Static Assets | CONFIRMED (later) |
| Background Jobs | Supabase pg_cron + Edge Functions (replaceable) | PROPOSED |
| Email | Supabase Auth emails + future transactional provider | PROPOSED |
| Payments | TBD — Razorpay proposed for India market | OWNER APPROVAL REQUIRED |

---

## 4. Five-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Layer 5: INTEGRATION GATEWAY                           │
│  External CRM adapter (mock) · Payment · Messaging      │
├─────────────────────────────────────────────────────────┤
│  Layer 4: ROLE-SPECIFIC EXPERIENCES                     │
│  Super Admin · Support Console · Tenant Admin           │
│  Practitioner Workspace · Customer Portal/PWA           │
├─────────────────────────────────────────────────────────┤
│  Layer 3: VERTICAL DOMAIN MODULES                       │
│  WellnessOS: 24 modules + optional add-ons              │
│  (Future: Real Estate, Legal, Retail, etc.)             │
├─────────────────────────────────────────────────────────┤
│  Layer 2: SHARED BUSINESS CORE                          │
│  Identity · CRM Foundation · Calendar · Finance         │
│  Workflows · AI Infrastructure · Notifications          │
│  Documents · Analytics · Audit                          │
├─────────────────────────────────────────────────────────┤
│  Layer 1: PLATFORM CONTROL PLANE                        │
│  Super Admin · Tenant Provisioning · Industry Registry  │
│  Module Registry · Entitlement Engine · Platform Billing│
│  Support Delegation · White-Label · Feature Flags       │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│  INFRASTRUCTURE                                          │
│  Supabase PostgreSQL + Auth + Storage + Edge Functions   │
│  (Future: Cloudflare Workers)                            │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Five-Tier User Hierarchy

| Tier | Role | Scope | Key Permissions |
|---|---|---|---|
| 1 | Super Admin | Platform-wide | Everything: tenants, modules, billing, governance |
| 2 | Dev Support/Ops | Scoped by delegation | Only explicitly granted permissions per employee |
| 3 | Tenant Admin | Own tenant + branches | Staff, programs, finance, local config |
| 4 | Practitioner/Staff | Assigned clients/branch | Clinical plans, schedules, assigned records |
| 5 | Patient/Customer | Own data only | Profile, bookings, plans, progress, payments |

**Authorization resolution order:**  
Authenticated identity → Active tenant context → Tenant active? → Module entitlement effective? → Role/delegation scope → Branch assignment → Resource ownership → Action policy

**Deny overrides allow. Absent grant = deny.**

---

## 6. Module Registry & Entitlement Engine

### Module Lifecycle
`draft → development → testing → available → deprecated → retired`

### Tenant Entitlement States
`enabled | disabled | suspended | trial | expired`

### Effective Entitlement Algorithm
A module is usable when ALL conditions are true:
1. Module lifecycle = `available`
2. Tenant status = `active`
3. Tenant entitlement = `enabled` or `trial` (within period)
4. All dependency modules are also effective
5. Feature flags permit the action
6. User has required role/permission for the specific action
7. Resource-level authorization passes

Changes invalidate caches. Background jobs re-check entitlements at execution time.

---

## 7. Proposed Project Structure

```
uniklife_master_dev/
├── CLAUDE.md                    # Claude Code instructions
├── LOGBOOK.md                   # Version history & daily log
├── README.md                    # Project readme
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .env.example                 # Template (no secrets)
├── .gitignore
│
├── docs/                        # Architecture & design docs
│   ├── ARCHITECTURE.md          # This file
│   ├── PRD.md                   # Product requirements
│   ├── DATABASE.md              # Schema & ERD
│   ├── SECURITY.md              # Security architecture
│   ├── API.md                   # API contracts
│   ├── DESIGN_SYSTEM.md         # UI design tokens
│   ├── CODE_STYLE.md            # Conventions
│   ├── TESTING.md               # Test strategy
│   └── MODULES.md               # 24-module inventory
│
├── supabase/
│   ├── config.toml              # Supabase CLI config
│   ├── migrations/              # Versioned SQL migrations
│   │   └── (timestamped .sql files)
│   └── seed/                    # Dev/demo seed data
│       └── (seed .sql files)
│
├── src/
│   ├── main.tsx                 # App entry
│   ├── App.tsx                  # Root component + router
│   │
│   ├── lib/                     # Shared utilities
│   │   ├── supabase.ts          # Supabase client init
│   │   ├── auth.ts              # Auth helpers
│   │   ├── constants.ts         # App-wide constants
│   │   └── utils.ts             # Generic utilities
│   │
│   ├── types/                   # Shared TypeScript types
│   │   ├── database.ts          # Generated DB types
│   │   ├── auth.ts              # Auth/role types
│   │   ├── modules.ts           # Module registry types
│   │   └── tenants.ts           # Tenant types
│   │
│   ├── hooks/                   # Shared React hooks
│   │   ├── useAuth.ts
│   │   ├── useTenant.ts
│   │   └── useModuleAccess.ts
│   │
│   ├── components/              # Shared UI components
│   │   ├── ui/                  # Base design system components
│   │   ├── layout/              # Shell, sidebar, header
│   │   └── common/              # Data tables, forms, modals
│   │
│   ├── platform/                # Layer 1: Control Plane
│   │   ├── super-admin/
│   │   ├── support/
│   │   ├── tenants/
│   │   ├── modules/
│   │   ├── entitlements/
│   │   └── billing/
│   │
│   ├── core/                    # Layer 2: Shared Business Core
│   │   ├── crm/
│   │   ├── calendar/
│   │   ├── finance/
│   │   ├── staff/
│   │   ├── workflows/
│   │   ├── ai/
│   │   ├── notifications/
│   │   ├── documents/
│   │   └── analytics/
│   │
│   ├── verticals/               # Layer 3: Industry Modules
│   │   └── wellness/            # WellnessOS
│   │       ├── dashboard/       # Module 01
│   │       ├── assessments/     # Module 06
│   │       ├── progress/        # Module 07
│   │       ├── care-plans/      # Module 08
│   │       ├── nutrition/       # Module 09
│   │       ├── fitness/         # Module 10
│   │       ├── habits/          # Module 11
│   │       ├── programs/        # Module 12
│   │       ├── portal/          # Module 13
│   │       ├── ai-agents/       # Module 14
│   │       ├── automation/      # Module 15
│   │       ├── practitioner/    # Module 16
│   │       └── reviews/         # Module 20
│   │
│   └── experiences/             # Layer 4: Role UIs
│       ├── admin/               # Super Admin experience
│       ├── support/             # Support console
│       ├── tenant/              # Tenant Admin experience
│       ├── practitioner/        # Staff workspace
│       └── customer/            # Client portal
│
├── public/                      # Static assets
│   └── favicon.svg
│
└── tests/                       # Test suites
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## 8. Database Design Overview

### Schema Domains (Proposed)

| Domain | Tables (candidates) | RLS |
|---|---|---|
| **Platform** | `platform_users`, `platform_roles` | Platform-scoped |
| **Tenants** | `tenants`, `tenant_memberships`, `branches` | Tenant-isolated |
| **Industries** | `industry_profiles`, `tenant_industries` | Read: all; Write: Super Admin |
| **Modules** | `global_modules`, `module_dependencies`, `tenant_entitlements`, `tenant_feature_settings` | Entitlement-scoped |
| **Delegation** | `support_permission_grants`, `module_change_approvals`, `module_entitlement_audit` | Audit-logged |
| **Tags** | `tag_definitions`, `entity_tags` | Tenant-scoped |
| **Vocabulary** | `tenant_vocabulary` | Tenant-scoped |
| **Branding** | `tenant_branding` | Tenant-scoped |
| **CRM** | `contacts`, `leads`, `lead_activities`, `opportunities` | Tenant-isolated |
| **Calendar** | `services`, `availability_slots`, `appointments` | Tenant-isolated |
| **Staff** | `staff_profiles`, `staff_schedules`, `coach_assignments` | Tenant+branch scoped |
| **Wellness** | `clients`, `health_assessments`, `health_measurements`, `care_plans`, `care_plan_versions`, `meal_plans`, `nutrition_entries`, `wellness_programs`, `wellness_enrollments`, `wellness_reviews` | Tenant-isolated + sensitivity |
| **Finance** | `invoices`, `transactions`, `subscription_accounts` | Tenant-isolated |
| **AI** | `ai_knowledge_bases`, `ai_agents`, `ai_conversations`, `ai_usage_logs` | Tenant-isolated |
| **Integrations** | `integration_connections`, `integration_events` | Tenant-isolated |
| **Audit** | `audit_logs` | Append-only, platform-readable |

### Key Design Rules
- Every tenant-owned table has `tenant_id` column with RLS policy
- Health data tables (`health_assessments`, `health_measurements`, `care_plans`) get additional column-level sensitivity markers
- `auth.users()` (Supabase Auth) is the identity source — `platform_users` maps profiles to auth IDs
- Soft delete via `deleted_at` for business data; hard delete only for GDPR/right-to-erasure
- All timestamps in UTC with `timestamptz`
- UUIDs for primary keys
- `created_at`, `updated_at`, `created_by`, `updated_by` on every table

---

## 9. Environment Strategy

| Environment | Supabase Project | App Runtime | Data | When Created |
|---|---|---|---|---|
| Local Dev | Supabase CLI (optional) | Vite dev server | Synthetic only | Phase 1 |
| Development | `uniklife-dev` | Local + Supabase hosted | Test data | Phase 1 (after approval) |
| Demo/Staging | `uniklife-demo` | Cloudflare Worker | Synthetic seed | On first demo request |
| Production | Separate paid project | Cloudflare Worker | Real customers | After go-live approval |

**Migration flow:** Write once → test on dev → promote to demo only on approval → promote to prod only on approval.

---

## 10. Phase Plan Summary

| Phase | Scope | Key Exit Criteria |
|---|---|---|
| **0 (NOW)** | Architecture blueprint, no code | Owner reviews & approves |
| **1** | Git setup, auth, Super Admin, tenants, RBAC, delegation, audit | Cross-tenant isolation tests pass |
| **2** | Industry/Module registries, entitlements, tags, vocabulary | Module enable/disable/revoke works server-side |
| **3** | White-label, tenant portals, customer portal shell | Branding per tenant proven |
| **4** | Wellness core: leads, clients, appointments, assessments, programs, plans, nutrition, progress | One synthetic client journey end-to-end |
| **5** | Practitioner UIs, fitness, habits, PWA, finance, reports, staff, branches | Booking/payment/report consistency |
| **6** | AI agents, workflow automation, human escalation | AI cannot bypass clinical approvals |
| **7** | Optional add-ons (home visits, partner network, commissions, etc.) | Each entitlement independently controls access |
| **8** | External CRM mock adapter, sync monitoring | System works with CRM disconnected |
| **9** | QA, security review, pilot | Owner go-live approval |

---

## 11. Open Decisions (Owner Approval Required)

| # | Decision | Options | Recommendation |
|---|---|---|---|
| 1 | Vertical product name | WellnessOS / FitLife OS / VitalOS / UnikWell | WellnessOS |
| 2 | UI component library | shadcn/ui / Radix + custom / Ant Design / Mantine | shadcn/ui (accessible, customizable, no vendor lock) |
| 3 | Payment provider | Razorpay / Stripe / Cashfree | Razorpay (India-first, UPI support) |
| 4 | Email/SMS provider | Resend / SendGrid / Amazon SES + MSG91 | Resend (email) + MSG91 (SMS/WhatsApp India) |
| 5 | Supabase region for dev | Mumbai (ap-south-1) / Singapore | Mumbai if available |
| 6 | State management | Zustand / TanStack Query / React Context | TanStack Query (server state) + Zustand (client state) |

---

## 12. Key Technical Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Supabase free tier limits | May hit row/storage/API limits during dev | Monitor usage; upgrade to Pro before demo |
| RLS policy complexity | 40+ tables each need correct policies | Generate from templates; automated policy tests |
| Cloudflare Workers 10ms CPU limit | Long operations may fail | Design for async; offload to Supabase Edge Functions |
| Module entitlement cache staleness | Users see features they shouldn't | Cache-bust on entitlement changes; server-side re-check |
| Health data compliance (India) | Legal requirements unclear | Flag for legal review before any real patient data |

---

*This document is a PROPOSED DESIGN. No code, infrastructure, or migrations will be created until the owner approves Phase 1.*

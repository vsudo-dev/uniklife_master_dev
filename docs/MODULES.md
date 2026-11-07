# UNIKLIFE.AI — Module Registry (v0.3.0)

**Version:** 0.3.0  
**Date:** 2026-10-28  
**Status:** PROPOSED — Pending owner approval

---

## Module Classification

| Layer | Classification | Scope | Example |
|---|---|---|---|
| 1 | `platform` | All industries, all tenants | Auth, Tenants, Audit |
| 2 | `core` | All industries (reusable business logic) | Contacts, Calendar, Finance |
| 3 | `vertical` | Industry-specific | Health Assessment, Nutrition |
| 3+ | `addon` | Optional per-tenant | Home Visits, Device Sync |

---

## Layer 1 — Platform Control Plane

### P01: Platform Auth & Identity
**Phase:** 1 | **Dependencies:** None  
**Description:** Supabase Auth integration, platform_users, 5-tier role system, MFA for Tier 1/2.  
**Tables:** platform_users, (leverages Supabase auth.users)  
**Key features:** Login/signup, password reset, MFA enrollment, session management, identity resolution functions.

### P02: Tenant Management
**Phase:** 1 | **Dependencies:** P01  
**Description:** Create, configure, activate, suspend, deactivate tenants.  
**Tables:** tenants, tenant_memberships  
**Key features:** Tenant CRUD, member invitation, role assignment, tenant status lifecycle, slug/URL management.

### P03: Branch Management
**Phase:** 1 | **Dependencies:** P02  
**Description:** Multi-location support within a tenant.  
**Tables:** branches, branch_assignments  
**Key features:** Branch CRUD, member-to-branch assignment, primary branch designation, timezone per branch.

### P04: Industry Registry
**Phase:** 2 | **Dependencies:** P02  
**Description:** Register and manage industry profiles. Each industry defines vocabulary defaults, navigation layout, dashboard config, and default roles.  
**Tables:** industry_profiles, tenant_industries  
**Key features:** Industry CRUD, tenant-to-industry binding, multi-industry per tenant support.

### P05: Module Registry
**Phase:** 2 | **Dependencies:** P04  
**Description:** Central registry of all platform modules with lifecycle, dependencies, permissions, and feature flags.  
**Tables:** global_modules  
**Key features:** Module CRUD, dependency declaration (JSONB), version tracking, lifecycle states (draft → beta → stable → deprecated → removed).

### P06: Entitlement Engine
**Phase:** 2 | **Dependencies:** P05  
**Description:** Assign, enable, disable, suspend modules per tenant with dependency validation.  
**Tables:** tenant_entitlements, tenant_feature_settings, module_entitlement_audit  
**Key features:** Entitlement state machine (pending → active → suspended/disabled → expired), dependency checks on enable/disable, cascade warnings, historical data preservation.

### P07: Support Delegation
**Phase:** 1 | **Dependencies:** P01, P02  
**Description:** Super Admin grants scoped permissions to Support/Ops team members. No self-grant, no indefinite grants, all audited.  
**Tables:** support_permission_grants, support_action_requests  
**Key features:** Grant lifecycle, approval queue, permission precedence, auto-expiry, revocation.

### P08: Platform Billing
**Phase:** Later | **Dependencies:** P02, P06  
**Description:** SaaS subscription management — tenant pays platform.  
**Tables:** subscription_accounts (+ payment gateway tables TBD)  
**Key features:** Plan tiers, billing cycles, usage-based billing, payment integration.

### P09: White-Label Engine
**Phase:** 3 | **Dependencies:** P02  
**Description:** Per-tenant branding: logos, colors, fonts, custom domains, email sender identity.  
**Tables:** tenant_branding  
**Key features:** Brand customization, theme generation (light/dark), subdomain/custom domain, email sender config.

### P10: Feature Flags & Quotas
**Phase:** 2 | **Dependencies:** P06  
**Description:** Toggle individual features within a module. Set usage quotas per tenant.  
**Tables:** tenant_feature_settings  
**Key features:** Feature-level enable/disable, quota definitions, quota enforcement hooks.

### P11: Audit & Security
**Phase:** 1 | **Dependencies:** P01  
**Description:** Immutable audit logging for all privileged operations.  
**Tables:** audit_logs, privileged_operation_log, health_data_access_log  
**Key features:** Actor attribution, tenant scoping, entity tracking, IP/user-agent capture, immutable records.

---

## Layer 2 — Shared Business Core

### C01: Native CRM Foundation
**Phase:** 4A | **Dependencies:** P02, P03  
**Description:** Contact management, lead tracking, pipeline stages, follow-ups.  
**Tables:** contacts, leads, lead_activities  
**Key features:** Contact CRUD, lead lifecycle, pipeline stages, assignment, activity logging, custom fields.  
**Wellness use:** Patients are contacts; leads convert to enrolled wellness clients.

### C02: Calendar & Scheduling
**Phase:** 4B | **Dependencies:** C01  
**Description:** Service definitions, staff availability, appointment booking with concurrency control.  
**Tables:** services, availability_slots, appointments  
**Key features:** Service CRUD, weekly availability, booking with lock-based concurrency, status transitions, reminder triggers.  
**Wellness use:** Consultations, follow-up appointments, dietitian sessions.

### C03: Staff & HR Core
**Phase:** 5 | **Dependencies:** P02, P03  
**Description:** Staff profiles, job titles, specializations, branch assignments.  
**Tables:** staff_profiles  
**Key features:** Staff directory, specialization tracking, branch binding, hire/termination lifecycle.

### C04: Finance Core
**Phase:** 5 | **Dependencies:** C01  
**Description:** Invoicing, payment tracking, refunds, receipts.  
**Tables:** invoices, transactions  
**Key features:** Invoice generation, line items, payment recording, status tracking, enrollment payment sync trigger.  
**Integration:** When shipped, connects to wellness_enrollments via trigger (see Architecture Section 10).

### C05: Notification Engine
**Phase:** 5 | **Dependencies:** P02  
**Description:** Multi-channel notification delivery with templates.  
**Tables:** notification_templates, notification_log  
**Key features:** Template CRUD per event type, channel routing (in-app, email, SMS, WhatsApp), delivery tracking, failure logging.

### C06: Document Management
**Phase:** 4A | **Dependencies:** C01  
**Description:** Secure file uploads with access control and category tagging.  
**Tables:** documents  
**Storage:** Supabase Storage buckets (public, documents, health-data).  
**Key features:** Upload, download, access level enforcement, category tagging, soft delete.

### C07: Workflow Engine
**Phase:** 6 | **Dependencies:** P06, C05  
**Description:** Event-driven automation: triggers, conditions, actions, retry logic.  
**Tables:** TBD (workflow_definitions, workflow_runs, workflow_steps)  
**Key features:** Event triggers, conditional branching, action execution, retry/backoff, execution logging.

### C08: AI Infrastructure
**Phase:** 6 | **Dependencies:** P06  
**Description:** Knowledge base management, AI agent configuration, usage metering.  
**Tables:** TBD (knowledge_bases, knowledge_items, ai_usage_log)  
**Key features:** Knowledge CRUD, agent config, usage tracking, cost attribution, tenant quotas.

### C09: Analytics & BI Core
**Phase:** 5 | **Dependencies:** P06  
**Description:** KPI definitions, aggregate computation, dashboard data framework.  
**Tables:** TBD (kpi_definitions, kpi_snapshots)  
**Key features:** KPI registry, scheduled aggregation, dashboard data API, role-scoped access.

### C10: Tags & Metadata
**Phase:** 2 | **Dependencies:** P02  
**Description:** Platform-wide and tenant-scoped tag definitions with entity tagging.  
**Tables:** tag_definitions, entity_tags  
**Key features:** Tag CRUD, namespace scoping (platform/tenant), entity type filtering, bulk tagging.

### C11: Dynamic Vocabulary
**Phase:** 2 | **Dependencies:** P04  
**Description:** Industry and tenant-level label overrides. UI shows custom labels; DB/API uses stable keys.  
**Tables:** tenant_vocabulary  
**Key features:** Term override per tenant+language, fallback to industry default, fallback to platform default.  
**Example:** term_key = 'patient' → default: 'Patient', wellness override: 'Client', real_estate override: 'Buyer'.

---

## Layer 3 — WellnessOS Vertical

### W01: Wellness Dashboard
**Phase:** 4H | **Dependencies:** W02–W12  
**Description:** Aggregated KPIs: enquiries, active clients, enrollments, revenue, practitioner workload.

### W02: Lead Generation
**Phase:** 4A | **Dependencies:** C01  
**Description:** Forms, landing pages, referral tracking, walk-in registration, campaign attribution.

### W03: Lead Management
**Phase:** 4A | **Dependencies:** C01  
**Description:** Pipeline stages, assignment rules, follow-up scheduling, conversion tracking.

### W04: Consultations & Appointments
**Phase:** 4B | **Dependencies:** C02, W05  
**Description:** Practitioner scheduling, client booking, reminder delivery, no-show tracking.

### W05: Client Registration & 360°
**Phase:** 4A | **Dependencies:** C01, C06  
**Description:** Wellness client profile, consent management, program timeline, document uploads, 360° view.  
**Tables:** wellness_clients, coach_assignments

### W06: Health Screening & Assessment
**Phase:** 4D | **Dependencies:** W05  
**Description:** Clinical intake forms, medical history, allergies, medications, practitioner review.  
**Tables:** health_assessments  
**Access:** Assignment-based only (see Security model).

### W07: Weight & Body Progress
**Phase:** 4E | **Dependencies:** W05, W06  
**Description:** Weight, body measurements, BMI, trends, progress charts.  
**Tables:** health_measurements  
**Access:** Assignment-based only.

### W08: Goals & Care Plans
**Phase:** 4F | **Dependencies:** W05, W06  
**Description:** Goal setting, versioned care plans, professional approval workflow.  
**Tables:** care_plans, care_plan_versions  
**Integrity:** Plan cannot be ACTIVE without approved_by set. Version history immutable.

### W09: Nutrition & Meal Planning
**Phase:** 4G | **Dependencies:** W05  
**Description:** Indian/Telugu food database, recipes, weekly meal builders, nutrition diary.  
**Tables:** food_items (global), recipes, recipe_ingredients, meal_plans, meal_plan_items, nutrition_entries

### W10: Activity & Fitness Coaching
**Phase:** 5 | **Dependencies:** W05  
**Description:** Exercise library, trainer-designed plans, session logging.  
**Tables:** exercise_library (global), activity_plans, activity_plan_items, activity_logs

### W11: Habits & Lifestyle
**Phase:** 5 | **Dependencies:** W05  
**Description:** Sleep, hydration, activity, mindfulness check-ins.  
**Tables:** habit_definitions, habit_checkins

### W12: Programs & Packages
**Phase:** 4C | **Dependencies:** W05  
**Description:** Configurable wellness programs (30/90/180-day), pricing, session credits, pause/resume.  
**Tables:** wellness_programs, wellness_enrollments  
**Finance:** Uses interim payment interface until Finance Core (Phase 5) ships.

### W13: Client Portal / PWA
**Phase:** 5 | **Dependencies:** W05, W07, W08, W09  
**Description:** White-label patient-facing app: view plans, track progress, book appointments, message practitioner.

### W14: AI Wellness Workforce
**Phase:** 6 | **Dependencies:** C08, W05  
**Description:** 10 proposed AI agents (intake, nutrition, fitness, etc.) with approved knowledge bases.  
**Tables:** ai_wellness_agents, ai_wellness_conversations  
**Constraint:** AI cannot bypass clinical approval workflows or tenant isolation.

### W15: Automation & Engagement
**Phase:** 6 | **Dependencies:** C07, W05  
**Description:** Automated lead assignment, appointment reminders, check-in prompts, renewal notifications.

### W16: Practitioner Workspace
**Phase:** 5 | **Dependencies:** W05, W06, W07, W08  
**Description:** Dietitian/doctor/coach dashboard: assigned clients, caseload, pending approvals, session notes.

### W17: Staff & HR Operations
**Phase:** 5 | **Dependencies:** C03  
**Description:** Staff directory, branch assignments, schedules, leave management, task boards.

### W18: Finance & Billing
**Phase:** 5 | **Dependencies:** C04, W12  
**Description:** Program-specific pricing, invoicing, installments, payment tracking, financial reports.

### W19: Product & Commerce
**Phase:** Later | **Dependencies:** C04  
**Description:** Wellness products (supplements, equipment), orders, fulfillment tracking.

### W20: Progress Reviews & Outcomes
**Phase:** 5 | **Dependencies:** W06, W07, W08  
**Description:** Periodic professional reviews, goal progress assessment, plan adjustments, client feedback.  
**Tables:** wellness_reviews

### W21: Community & Challenges
**Phase:** Later | **Dependencies:** W05  
**Description:** Wellness groups, workshops, coaching sessions, habit challenges, leaderboards.

### W22: Reports & BI
**Phase:** 5 | **Dependencies:** C09  
**Description:** Marketing, sales, clinical outcomes, financial, AI usage, retention reports.

### W23: Multi-Branch & Franchise
**Phase:** 5 | **Dependencies:** P03  
**Description:** Cross-branch role management, branch-level settings, consolidated reporting.

### W24: Settings & Integrations
**Phase:** 4A | **Dependencies:** P06, P09  
**Description:** Tenant configuration, role permissions, AI settings, data retention policies.

---

## Optional Add-Ons (Layer 3+)

| ID | Add-On | Phase | Dependencies |
|---|---|---|---|
| WX01 | Home Visits & GPS | 7 | W04, W16 |
| WX02 | Partner Network & Referrals | 7 | C01, W05 |
| WX03 | Practitioner Commissions | 7 | C04, W16 |
| WX04 | AI Assistant (paid tier) | 7 | W14 |
| WX05 | 3D Facility Viewer | 7 | P03 |
| WX06 | Advanced Analytics | 7 | C09, W22 |
| WX07 | Corporate Wellness | 7 | W12, W05 |
| WX08 | Device & Wearable Sync | 7 | W07, W10 |
| WX09 | Lab Integration | 7 | W06 |
| WX10 | Video Consultations | 7 | W04 |

---

## Applicability Matrix (Wellness Verticals)

| Module | Weight Loss | Fitness | Wellness Clinic |
|---|---|---|---|
| W01 Dashboard | Yes | Yes | Yes |
| W02 Lead Gen | Yes | Yes | Yes |
| W03 Lead Mgmt | Yes | Yes | Yes |
| W04 Appointments | Yes | Yes | Yes |
| W05 Client 360 | Yes | Yes | Yes |
| W06 Health Assessment | Yes | Optional | Yes |
| W07 Weight Progress | **Primary** | Optional | Yes |
| W08 Care Plans | Yes | Yes | Yes |
| W09 Nutrition | **Primary** | Yes | Yes |
| W10 Fitness | Optional | **Primary** | Optional |
| W11 Habits | Yes | Yes | Yes |
| W12 Programs | Yes | Yes | Yes |
| W13 Client Portal | Yes | Yes | Yes |
| W14 AI Agents | Yes | Yes | Yes |
| W15 Automation | Yes | Yes | Yes |
| W16 Practitioner WS | Yes | Yes | Yes |
| W17 Staff/HR | Yes | Yes | Yes |
| W18 Finance | Yes | Yes | Yes |
| W19 Commerce | Optional | Yes | Optional |
| W20 Reviews | Yes | Yes | Yes |
| W21 Community | Optional | Yes | Optional |
| W22 Reports | Yes | Yes | Yes |
| W23 Multi-Branch | Optional | Optional | Yes |
| W24 Settings | Yes | Yes | Yes |

---

*This is a PROPOSED DESIGN. No modules will be implemented until the owner approves.*

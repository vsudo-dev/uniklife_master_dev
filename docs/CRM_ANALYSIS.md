# UNIKLIFE.AI — Existing CRM Platform Analysis

**Date:** 2026-10-28  
**Status:** VERIFIED IN CURRENT WORKSPACE  
**Source:** Public API schema at myappzbackend.com (Supabase REST OpenAPI)

---

## 1. Platform Identity

| Property | Value |
|---|---|
| **Platform Name** | SaaSUniverse / MyAppz (white-label) |
| **Login URL** | https://login.uniklife.ai |
| **Backend API** | https://myappzbackend.com |
| **Backend Type** | Supabase (PostgreSQL + Auth + Edge Functions) |
| **Hosting** | Amazon S3 + Caddy (frontend), Kong API Gateway (backend) |
| **Frontend** | Vite SPA (React), PWA-enabled |
| **DB Version** | PostgREST 14.5 |
| **Total Tables** | ~1,967 |
| **Total RPC Functions** | ~500+ |

This is a **GoHighLevel-style** white-label SaaS platform (agency → sub-accounts model). UNIKLIFE.AI is a white-label instance of this platform.

---

## 2. Platform Architecture (Their Model)

```
Agency (UNIKLIFE.AI)
  └── Sub-Accounts (= Tenants/Businesses)
       ├── Contacts (= Clients/Customers/Patients)
       ├── Calendar Bookings
       ├── Pipelines & Opportunities
       ├── Courses & Memberships
       ├── Community
       ├── Portal (client-facing)
       ├── Forms & Surveys
       ├── Funnels & Websites
       ├── Email/SMS/WhatsApp
       ├── Workflows & Automations
       ├── Invoices & Payments
       ├── Products & E-commerce
       └── AI Agents & Brain
```

---

## 3. Key Entities Available in CRM

### Contacts & CRM
- `contacts` — Main contact/customer/patient records
- `contact_tags`, `contact_notes`, `contact_tasks`, `contact_activities`
- `contact_custom_field_values` — Extensible fields
- `contact_documents`, `contact_files`
- `contact_follow_ups`, `contact_assignments`
- `contact_scores`, `contact_sources`
- `contact_memberships`, `contact_relationships`
- `pipeline_folders`, `opportunity_custom_field_values`

### Calendar & Bookings
- `calendar_bookings` — Appointments/consultations
- `calendar_event_types` — Service types
- `calendar_staff`, `calendar_staff_availability`
- `calendar_staff_services`, `calendar_booking_staff`
- `calendar_weekly_hours`, `calendar_blocked_dates`
- `calendar_form_fields` — Booking form customization
- `cal_packages`, `cal_package_purchases`
- `cal_booking_attendees`, `cal_booking_deliverables`
- `cal_payment_transactions`

### Finance & Payments
- `invoice_pdfs`, `payment_gateway_configs`
- `payment_gateway_connections`, `payment_gateway_transactions`
- `payment_receipts`, `payment_link_events`
- `commission_plans`, `commission_earnings`, `commission_payouts`
- `commission_adjustments`

### Courses & Education
- `courses`, `course_sections`, `course_lectures`
- `course_enrollments`, `course_lecture_progress`
- `course_assessments`, `course_assessment_questions`
- `course_certificate_designs`

### Community
- `community_channels`, `community_posts`, `community_messages`
- `community_memberships`, `community_profiles`
- `community_events`, `community_badges`
- `community_leaderboard_seasons`
- `community_settings`

### Portal (Client-Facing)
- `client_portal_settings`, `client_portal_users`
- `portal_custom_menus`, `portal_links`
- `portal_notifications`, `portal_login_events`
- `portal_habit_checkins` ← **Habits already exist!**
- `portal_success_habits` ← **Success habits tracking!**
- `portal_groups`, `portal_group_messages`
- `portal_lesson_comments`

### Memberships
- `membership_announcements`, `membership_checkouts`
- `community_membership_entitlements`
- `contact_memberships`

### Forms & Surveys
- `builder_forms`, `form_submissions`
- `form_events`, `form_themes`

### Funnels & Websites
- `funnel_events`, `funnel_folders`, `funnel_templates`
- `site_*` tables (website builder)
- `store_domains`, `store_themes`

### AI & Automation
- `ai_agents`, `ai_agent_prompts`, `ai_voice_agents`
- `agentic_agents`, `agentic_runs`, `agentic_tools`
- `brain_knowledge_items`, `brain_document_chunks`
- `workflow_*` (automation engine)
- `chatflow_*` (conversational flows)

### Email/SMS/Messaging
- `email_templates`, `email_marketing_campaigns`
- `email_sequences`, `email_sequence_steps`
- `sms_*` (SMS messaging)
- `chat_messages`, `chat_channels`
- `comm_campaigns`, `comm_messages`

### Staff & Organization
- `sub_accounts` — Tenants/Businesses
- `sub_account_members` — Staff
- `agency_staff_scope` — Staff permissions
- `org_departments`, `org_teams`
- `org_staff_hierarchy`

### Products & E-commerce
- `products_*` tables
- `store_*` tables
- `payment_gateway_*`

### Webhooks & Integrations
- `webhook_*` tables
- `integration_*` tables

---

## 4. What the CRM ALREADY Handles (Don't Rebuild)

| Capability | CRM Tables | Status |
|---|---|---|
| Contact/Patient management | `contacts`, `contact_*` | EXISTS |
| Appointment booking | `calendar_bookings`, `calendar_*` | EXISTS |
| Staff management | `sub_account_members`, `agency_staff_*` | EXISTS |
| Pipeline/Lead management | `pipeline_*`, `opportunity_*` | EXISTS |
| Invoices & Payments | `invoice_*`, `payment_*` | EXISTS |
| Email/SMS campaigns | `email_*`, `sms_*`, `comm_*` | EXISTS |
| Forms & Surveys | `builder_forms`, `form_submissions` | EXISTS |
| Courses/Education | `courses`, `course_*` | EXISTS |
| Community | `community_*` | EXISTS |
| Basic Portal | `client_portal_*`, `portal_*` | EXISTS |
| Habit check-ins | `portal_habit_checkins`, `portal_success_habits` | EXISTS |
| AI Agents | `ai_agents`, `agentic_*`, `brain_*` | EXISTS |
| Workflows/Automation | `workflow_*`, `chatflow_*` | EXISTS |
| Commissions | `commission_*` | EXISTS |
| Webhooks | `webhook_*` | EXISTS |
| Audit logs | `audit_logs`, `auth_audit_log` | EXISTS |

---

## 5. What the CRM Does NOT Have (WellnessOS Must Build)

| Capability | Why It's Needed | Build In |
|---|---|---|
| **Health Assessment & Screening** | Medical history, allergies, conditions, medications — CRM has no clinical intake | WellnessOS + Supabase |
| **Weight & Body Progress Tracking** | Structured weight/measurement/BMI tracking with charts — not just custom fields | WellnessOS + Supabase |
| **Care Plans (Versioned, Approved)** | Professional-approved wellness plans with versioning — CRM has no clinical workflow | WellnessOS + Supabase |
| **Nutrition & Meal Planning** | Food database, meal templates, weekly builder, Indian/Telugu foods — entirely domain-specific | WellnessOS + Supabase |
| **Activity & Fitness Plans** | Exercise libraries, trainer-assigned plans, session logging | WellnessOS + Supabase |
| **Clinical Practitioner Workspace** | Dietitian/doctor-specific views of assigned patients with clinical context | WellnessOS frontend |
| **Wellness Dashboard** | KPIs specific to wellness: weight trends, plan compliance, coach workload | WellnessOS frontend |
| **Programs & Packages (Wellness)** | 30/90/180-day configurable wellness programs with session credits | WellnessOS + Supabase (or CRM products) |
| **Progress Reviews & Outcomes** | Structured professional reviews, goal assessments, plan adjustments | WellnessOS + Supabase |
| **White-label Client PWA** | Dedicated wellness patient app (not generic portal) | WellnessOS frontend |

---

## 6. Integration Strategy

```
┌─────────────────────────────────────────┐
│  EXISTING CRM (SaaSUniverse/MyAppz)     │
│  Backend: myappzbackend.com             │
│  ├── Contacts (patients)                │
│  ├── Calendar (appointments)            │
│  ├── Payments (invoices)                │
│  ├── Forms (intake forms)               │
│  ├── Community (groups)                 │
│  ├── Courses (education)                │
│  ├── Portal (basic client login)        │
│  ├── Habits (basic check-ins)           │
│  ├── AI Agents                          │
│  └── Workflows (automation)             │
│         │                               │
│     API / Webhooks / Supabase REST      │
│         │                               │
├─────────┼───────────────────────────────┤
│         ▼                               │
│  WELLNESSOS (What we build)             │
│  Backend: Our Supabase (uniklife-dev)   │
│  Frontend: React + Vite PWA             │
│  ├── Health Assessments                 │
│  ├── Weight/Body Progress               │
│  ├── Care Plans (versioned)             │
│  ├── Nutrition & Meal Planning          │
│  ├── Fitness & Activity Plans           │
│  ├── Wellness Dashboard                 │
│  ├── Practitioner Workspace             │
│  ├── Programs (wellness-specific)       │
│  ├── Progress Reviews                   │
│  └── Client PWA (white-label)           │
│                                         │
│  Reads FROM CRM:                        │
│    - Contact profiles                   │
│    - Appointment bookings               │
│    - Payment status                     │
│    - Form submissions (intake)          │
│                                         │
│  Writes TO CRM:                         │
│    - Contact notes/activities           │
│    - Tags (wellness status)             │
│    - Task creation                      │
│    - Webhook events                     │
└─────────────────────────────────────────┘
```

---

## 7. Authentication Strategy

The CRM has its own auth:
- Staff login: Supabase Auth (`sb-*-auth-token` in localStorage)
- Portal/Client login: Separate portal session (`portal_session_token`)
- PIN-based login for portal users (`portal_pin_reset_otps`)

**Options for WellnessOS:**
1. **Use CRM's portal auth** — patients log in through the existing portal system, WellnessOS reads the session
2. **Separate Supabase Auth** — WellnessOS has its own auth, linked to CRM contact_id
3. **Hybrid** — Staff use CRM auth, patients use WellnessOS auth linked to CRM contacts

**Recommendation:** Option 1 or 3 depending on how much control we need. OWNER APPROVAL REQUIRED.

---

## 8. Key RPC Functions (Useful for Integration)

- `current_portal_session_contact_id` — Get logged-in portal user's contact
- `current_portal_session_sub_account_id` — Get tenant context
- `cal_upsert_booking_contact` — Create/update booking contact
- `cal_cancel_pending_booking` — Cancel a booking
- `cal_mark_booking_paid` — Mark booking as paid
- `can_act_as_contact` — Check permissions
- `contact_session_in_subaccount` — Verify contact belongs to tenant

---

*This analysis is based on the publicly accessible OpenAPI schema. Actual data access requires authenticated credentials. Do not access, modify, or write to the CRM database without owner authorization.*

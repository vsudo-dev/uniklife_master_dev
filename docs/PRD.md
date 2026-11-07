# UNIKLIFE.AI — Product Requirements Document (v0.3.0)

**Version:** 0.4.0  
**Date:** 2026-11-02  
**Status:** APPROVED — Updated to reflect owner-approved strategy

---

## 1. Product Vision

UNIKLIFE.AI is an independently owned, multi-tenant, multi-industry, white-label SaaS Business Operating System.

**First vertical:** Weight Loss & Wellness (WellnessOS)

**Vision statement:** A single platform that lets any business owner — starting with wellness practitioners — run their entire operation under their own brand, with clinical-grade data privacy, multi-branch support, and optional AI assistance.

---

## 2. Target Users

### Primary Users (WellnessOS)

| User | Description | Tier |
|---|---|---|
| **Wellness Business Owner** | Runs a weight loss clinic, fitness studio, or wellness center. Manages staff, clients, finances. | Tenant Admin (Tier 3) |
| **Dietitian / Nutritionist** | Creates meal plans, conducts assessments, tracks client progress. | Practitioner (Tier 4) |
| **Fitness Coach / Trainer** | Designs exercise programs, logs sessions, monitors activity. | Practitioner (Tier 4) |
| **Doctor / Specialist** | Reviews clinical data, approves care plans, handles referrals. | Practitioner (Tier 4) |
| **Front Desk / Receptionist** | Manages appointments, walk-ins, payments, basic CRM. | Staff (Tier 4) |
| **Patient / Client** | Views their own plans, logs meals/habits, books appointments, tracks progress. | Customer (Tier 5) |

### Platform Users

| User | Description | Tier |
|---|---|---|
| **Platform Owner (Venkatesh)** | Manages all tenants, industries, modules, billing. | Super Admin (Tier 1) |
| **Technical Support** | Handles tenant issues with delegated, scoped, audited permissions. | Dev Support/Ops (Tier 2) |

---

## 3. Market Context

- India's wellness industry is growing rapidly (weight management, preventive health, fitness).
- Most small-to-mid wellness businesses use paper records, WhatsApp, or generic CRMs that lack clinical capabilities.
- Existing solutions are either too expensive (HealthifyMe Pro, Practo for clinics) or too generic (generic CRMs).
- There is no affordable, white-label, multi-tenant wellness OS for the Indian market with regional food databases and Telugu/Hindi language support.

---

## 4. Key Differentiators

1. **Multi-industry by design** — Global SaaS core works for any industry. WellnessOS is the first vertical, not the only one. Real Estate, Finance, Education and more follow on the same core.
2. **White-label** — Each tenant sees their own brand, colors, domain. No "powered by" visible to patients.
3. **Assignment-based health privacy** — Practitioners see only their assigned patients. No blanket role-based access to clinical data.
4. **Indian market first** — INR currency, Indian food database (including Telugu/South Indian), UPI payments, WhatsApp notifications.
5. **Clinical + business in one platform** — Not just a CRM. Versioned care plans, professional approval workflows, medical history tracking.
6. **AI with guardrails** — AI agents cannot bypass clinical approvals, access unassigned patient data, or act beyond tenant boundaries.
7. **Smart launch strategy** — Uses MyAppz CRM as the backbone now to launch fast, while building the clinical layer nobody else has. Own CRM replaces MyAppz in Stage 3 for full independence.

---

## 5. Non-Goals (Explicit)

- This is NOT a standalone replacement for MyAppz CRM in Stage 1. MyAppz is the CRM backbone — UNIKLIFE.AI connects to it for contacts, bookings, billing, and campaigns. Building our own CRM is a Stage 3 long-term goal.
- This is NOT an EHR/EMR system. It tracks wellness data (weight, nutrition, fitness) — not clinical diagnoses, prescriptions, or lab orders (though lab integration is a future add-on).
- This is NOT a consumer fitness app. It is a B2B platform for wellness businesses to manage their operations and serve their clients.
- No mobile native app in Phase 1–5. The client portal is a PWA (progressive web app).

---

## 6. Technology Decisions

| Area | Choice | Status |
|---|---|---|
| Frontend | React + TypeScript + Vite | Confirmed |
| UI library | shadcn/ui + Tailwind CSS | Approved |
| State management | TanStack Query (server) + Zustand (client) | Approved |
| Database | Supabase PostgreSQL with RLS | Confirmed |
| Auth | Supabase Auth (independent, 5-tier) | Confirmed |
| Storage | Supabase Storage (3 buckets: public, documents, health-data) | Confirmed |
| Backend logic | Supabase Edge Functions (Deno) | Confirmed |
| Background jobs | pg_cron (Supabase extension) | Confirmed |
| Future hosting | Cloudflare Workers (static assets only) | Confirmed |
| Payment | Razorpay (proposed) | Pending |
| Email | Resend (proposed) | Pending |
| SMS/WhatsApp | MSG91 (proposed) | Pending |

---

## 7. Design Direction

| Aspect | Specification |
|---|---|
| Brand colors | Deep Royal Blue (#1a237e) + Metallic Gold (#c9a84c) — platform defaults |
| Typography | Urbanist (primary), system sans-serif fallback |
| Theme | Light and dark mode, per-tenant customizable |
| Layout | Sidebar navigation with grouped sections (like existing CRM pattern) |
| Mobile | Responsive design; client portal as installable PWA |
| Accessibility | WCAG 2.1 AA target (shadcn/ui provides accessible primitives) |

---

## 8. Success Criteria by Phase

### Phase 1 — Foundation
- Supabase dev project running
- Auth works with all 5 tiers
- Cross-tenant isolation verified with automated tests
- Support delegation lifecycle works
- All Phase 1 negative security tests pass

### Phase 4H — Wellness Core Complete
- One synthetic client can complete full journey: register → assess → enroll → plan → measure → log meals → review
- Assignment-based health data access enforced
- Care plan approval workflow functional

### Phase 5 — Operations Complete
- Full booking → plan → progress → review cycle
- Client PWA installable and functional
- Finance module connected to enrollments
- Practitioner workspace shows caseload and pending actions

### Phase 9 — Pilot Ready
- All security tests pass
- Performance acceptable on Supabase free/starter tier
- One real tenant onboarded for pilot
- Owner gives explicit go-live approval

---

## 9. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Scope creep across 56 modules | High | Schedule slip | Strict phase gates; owner approval between phases |
| Supabase free tier limits hit during dev | Medium | Dev blocked | Monitor row counts; upgrade proactively |
| RLS policy bugs allowing data leak | Medium | Critical (privacy breach) | Automated negative tests on every migration |
| Indian food database coverage gaps | Medium | Poor UX for core feature | Start with curated set; allow tenant-added items |
| Single-developer bottleneck | High | Slow progress | AI-assisted development; modular architecture allows parallel work |
| Legal ambiguity for digital health data in India | Medium | Compliance risk | Legal review before real patient data; DPDPA 2023 compliance tracking |

---

## 10. Open Questions

1. Confirm product name: "WellnessOS" for the vertical? Or alternative?
2. Supabase region: Mumbai (ap-south-1) if available?
3. Payment provider: Razorpay confirmed, or alternatives to evaluate?
4. Email/SMS providers: Resend + MSG91, or alternatives?
5. Domain strategy: What domain/subdomain for the dev environment?
6. Pilot tenant: Who is the first real tenant for beta testing?

---

---

## 11. 3-Stage Strategy (Owner Approved 2026-11-02)

| Stage | What | When |
|---|---|---|
| Stage 1 | UNIKLIFE.AI platform + connect to MyAppz CRM as backbone | Now — in progress |
| Stage 2 | Launch, stable operations, grow revenue | After go-live |
| Stage 3 | Build own CRM, disconnect MyAppz, full independence | Long-term future |

Full detail in `docs/VISION_AND_STRATEGY.md`.

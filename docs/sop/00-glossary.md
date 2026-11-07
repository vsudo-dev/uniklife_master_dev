# Glossary — Key Terms

> Read this first. These terms are used everywhere in UNIKLIFE.AI.

---

## Platform Terms

| Term | Meaning |
|------|---------|
| **UNIKLIFE.AI** | The SaaS platform we are building. Multi-tenant, white-label. |
| **Tenant** | A business that runs on the platform (e.g. "Healthy Lifestyle"). Each tenant is fully isolated — they cannot see each other's data. |
| **Branch** | A physical or virtual location under a tenant (e.g. "Chennai Branch", "Online"). One tenant can have multiple branches. |
| **White-label** | Each tenant can have their own logo, colors, and name. It looks like their own product. |
| **Module** | A feature set that can be turned ON or OFF per tenant (e.g. Wellness, Finance, Nutrition). |
| **Entitlement** | Whether a tenant has a specific module enabled or disabled. |
| **Slug** | A short URL-friendly name for a tenant (e.g. `healthy-lifestyle`). Used in the browser URL: `/t/healthy-lifestyle/`. |

---

## User Roles

| Role | Who They Are |
|------|-------------|
| **Super Admin** | UNIKLIFE platform owner. Can see and manage all tenants. |
| **Tenant Admin** | Owner/manager of one tenant. Can manage their own branches, staff, and clients. |
| **Practitioner** | A health professional (doctor, trainer, nutritionist) assigned to one or more branches. |
| **Staff** | Receptionist, coordinator, or support staff within a tenant. |
| **Customer** | The end client/patient. Has access to their own portal only (future phase). |

---

## CRM Terms

| Term | Meaning |
|------|---------|
| **MyAppz** | The CRM platform UNIKLIFE subscribes to (we do not own it). It manages contacts, appointments, invoices, automations. |
| **CRM** | Customer Relationship Management — the system that tracks contacts, bookings, and billing. |
| **Webhook** | An automatic notification MyAppz sends to UNIKLIFE whenever something changes (contact created, appointment booked, invoice raised). |
| **crm_contact_id** | The unique ID MyAppz assigns to each contact. We store this to link our data back to MyAppz. |
| **crm_location_id** | The unique ID MyAppz uses for a sub-account (maps to our tenant). |
| **Tag** | A label attached to a contact in MyAppz (e.g. `test_healthy-fitness`). Used to control which contacts sync to UNIKLIFE. |
| **Tag Filter** | Our rule: only contacts tagged `test_healthy-fitness` in MyAppz are synced to the Healthy Lifestyle tenant. |

---

## Client / Wellness Terms

| Term | Meaning |
|------|---------|
| **Contact** | A person record synced from MyAppz. This is the base record — name, email, phone. |
| **Wellness Client** | An optional layer on top of a contact. Activated by a practitioner when the person starts a wellness program. Has health data, assessments, care plans. |
| **Activate Wellness Profile** | The action a practitioner takes to turn a contact into a wellness client. Only done once per contact. |
| **Health Assessment** | A structured evaluation of a client's health (BMI, vitals, goals). |
| **Care Plan** | A treatment or wellness plan created by a practitioner for a specific client. |
| **Check-in** | A regular progress check with the client — mood, notes, status. |
| **Goal** | A specific outcome set for a client (e.g. "Lose 5kg by March"). Tracks progress and status. |

---

## Common Confusion

| "Is X the same as Y?" | Answer |
|----------------------|--------|
| Contact = Wellness Client? | No. A contact is a CRM record. A wellness client is activated from a contact when health tracking begins. |
| Tenant = Branch? | No. A tenant is the whole business. A branch is a location under that business. |
| MyAppz = UNIKLIFE CRM? | MyAppz is the vendor. UNIKLIFE subscribes to it. We call it "our CRM" but we don't own it. |
| BOSS = Sub-account? | No. BOSS is a calendar event name inside the UNIKLIFE MyAppz account. Not a separate sub-account. |
| Appointment in UNIKLIFE = Appointment in MyAppz? | Same data. We mirror it via webhook. MyAppz is the source of truth for appointments. |

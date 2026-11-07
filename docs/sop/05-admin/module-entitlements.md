# Module Entitlements

---

## What Are Modules?

UNIKLIFE is built as a modular platform. Features are grouped into modules that can be turned ON or OFF per tenant.

This means:
- Tenant A can have Wellness + Finance modules
- Tenant B can have only Appointments module
- Each tenant pays for and uses only what they need

---

## Available Modules (Examples)

| Module | What It Unlocks |
|--------|----------------|
| Wellness Core | Client health profiles, assessments, body progress |
| Care Plans | Personalised treatment plans |
| Nutrition | Meal plans and food logging |
| Programs | Wellness programs and enrollment |
| Progress Reviews | Check-ins and goal tracking |
| Finance | Invoices and billing view |
| Staff Management | Staff profiles and assignments |
| Reports | Revenue and wellness analytics |
| Documents | CRM document viewer |
| Practitioner Workspace | Daily schedule and quick notes |

---

## How to Enable/Disable a Module

> Only the **Super Admin** can change module entitlements.

1. Go to the Platform dashboard
2. Select the tenant
3. Open **Module Entitlements**
4. Toggle the module ON or OFF
5. Save

Changes take effect immediately — the tenant's navigation updates automatically.

---

## Dependency Rules

Some modules depend on others:
- Nutrition requires Wellness Core
- Care Plans requires Wellness Core
- Programs requires Wellness Core

Disabling a parent module will also disable dependent modules.

---

## Module Status Values

| Status | Meaning |
|--------|---------|
| Active | Enabled and in use |
| Inactive | Disabled — feature is hidden from tenant |
| Pending | Requested but not yet approved |

---

## Who Can Manage Modules?

| Role | Can Change |
|------|:----------:|
| Super Admin | ✅ |
| Tenant Admin | ❌ (can request) |
| Others | ❌ |

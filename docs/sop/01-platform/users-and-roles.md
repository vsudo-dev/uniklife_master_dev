# Users & Roles

---

## The 5-Tier Hierarchy

```
Super Admin
    └── Tenant Admin
            ├── Practitioner
            ├── Staff
            └── Customer
```

Each role has access only to what they need. Higher roles can see more.

---

## Role Descriptions

### Super Admin
- UNIKLIFE platform owner
- Can see and manage **all tenants**
- Can create tenants, enable/disable modules
- Can grant support delegation (temporary access to support staff)
- There is only one Super Admin

### Tenant Admin
- Owner or manager of a specific tenant (e.g. Healthy Lifestyle)
- Can manage their own branches, staff, and clients
- Can view reports, billing, and audit logs for their tenant
- Cannot see other tenants

### Practitioner
- A health professional (doctor, trainer, nutritionist)
- Assigned to one or more branches
- Can see clients, assessments, care plans, nutrition for their assigned branches
- Has access to Practitioner Workspace (daily schedule, client queue, quick notes)
- Cannot access admin settings or billing

### Staff
- Receptionist, coordinator, front desk
- Can view clients and appointments
- Cannot access health data, care plans, or admin settings

### Customer
- The end client/patient
- Has access to their own portal only (future phase — not yet built)
- Can view their own appointments, invoices, and wellness progress

---

## Access Summary

| Feature | Super Admin | Tenant Admin | Practitioner | Staff | Customer |
|---------|:-----------:|:------------:|:------------:|:-----:|:--------:|
| All tenants | ✅ | ❌ | ❌ | ❌ | ❌ |
| Tenant dashboard | ✅ | ✅ | ✅ | ✅ | ❌ |
| Client health data | ✅ | ✅ | ✅ | ❌ | Own only |
| Billing | ✅ | ✅ | ❌ | ❌ | Own only |
| Staff management | ✅ | ✅ | ❌ | ❌ | ❌ |
| Module entitlements | ✅ | ❌ | ❌ | ❌ | ❌ |
| Audit logs | ✅ | ✅ | ❌ | ❌ | ❌ |
| Support delegation | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## How Roles Are Assigned

1. Super Admin is set by a database trigger on a specific email address
2. Tenant Admin is assigned when the tenant is created
3. Practitioners and Staff are added via the Staff page by the Tenant Admin
4. Each staff member's role is set in their profile (Job Title + Role)

---

## Role After Login

When a user logs in, the system checks their role and routes them:
- Super Admin → Platform dashboard
- Tenant Admin / Practitioner / Staff → Tenant dashboard at `/t/{slug}/`

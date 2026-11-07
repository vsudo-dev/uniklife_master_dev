# Tenants & Branches

---

## What is a Tenant?

A **tenant** is a business that runs on the UNIKLIFE platform.

- Example: "Healthy Lifestyle" is a tenant
- Each tenant has their own clients, staff, appointments, and billing
- Tenants are completely isolated — Tenant A cannot see Tenant B's data
- Each tenant gets a unique URL slug: `/t/healthy-lifestyle/`

---

## What is a Branch?

A **branch** is a location or division within a tenant.

- Example: Healthy Lifestyle has "Chennai Branch" and "Online"
- Staff and practitioners are assigned to specific branches
- A practitioner assigned to Branch A cannot access Branch B

---

## Tenant → Branch Relationship

```
UNIKLIFE Platform
└── Tenant: Healthy Lifestyle
    ├── Branch: Chennai
    ├── Branch: Bangalore
    └── Branch: Online
```

---

## Who Manages What?

| Action | Who Can Do It |
|--------|--------------|
| Create a new tenant | Super Admin only |
| Create a branch | Tenant Admin |
| Assign staff to a branch | Tenant Admin |
| View all tenants | Super Admin only |
| View own tenant's branches | Tenant Admin, Practitioner |

---

## Tenant Settings

Each tenant can configure:
- **Name** — display name shown in the UI
- **Slug** — URL identifier (set once, do not change after going live)
- **CRM Location ID** — links the tenant to their MyAppz sub-account
- **CRM Contact Tag** — the tag filter for contact sync (e.g. `test_healthy-fitness`)
- **Branding** — logo, primary color, accent color

> See [Branding](../05-admin/branding.md) for how to set up tenant branding.

---

## Branch Assignment Rules

- A practitioner must be assigned to a branch to see that branch's clients
- Removing a practitioner from a branch immediately revokes their access
- One practitioner can be assigned to multiple branches

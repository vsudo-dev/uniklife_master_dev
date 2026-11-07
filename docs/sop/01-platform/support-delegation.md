# Support Delegation

---

## What Is It?

Support Delegation allows the **Super Admin** to grant a support staff member **temporary access** to perform specific actions on a tenant's account — without giving them a permanent role.

Use case: A support agent needs to update a tenant's billing config or change a module entitlement. Instead of giving them permanent admin access, the Super Admin creates a time-limited delegation grant.

---

## How It Works

```
Super Admin creates a grant
    → Specifies: who (support member), which tenant, what actions, expiry date
    → Grant becomes "active"
    → Support member can now perform those actions
    → Grant expires automatically at the set date/time
    → Or Super Admin revokes it manually
```

---

## Grant Details

| Field | Description |
|-------|-------------|
| **Grantee** | The support staff member receiving access |
| **Tenant** | Which tenant they can act on |
| **Allowed Actions** | Specific actions permitted (e.g. `tenant.config.update`, `module.entitlement.change`) |
| **Expires At** | Date and time when access automatically ends |
| **Status** | active / expired / revoked |

---

## Rules

- Only the **Super Admin** can create delegation grants
- A support member **cannot grant themselves** access
- Grants **must have an expiry date** — open-ended grants are not allowed
- A grant that has expired cannot be reactivated — a new one must be created
- Revoked grants cannot be un-revoked
- Access is removed **immediately** when revoked or expired

---

## Actions That Can Be Delegated

| Action Code | What It Allows |
|-------------|----------------|
| `module.entitlement.change` | Enable or disable modules for a tenant |
| `tenant.config.read` | View tenant configuration |
| `tenant.config.update` | Update tenant settings |
| `tenant.branding.update` | Change tenant logo/colors |
| `tenant.membership.manage` | Manage tenant memberships |
| `platform.user.manage` | Manage platform users |

---

## Approvals

Some actions require an approval step before they execute:
- When `requires_approval = true`, the action is **queued** as a pending request
- A Super Admin must approve it before it runs
- When `requires_approval = false`, it executes immediately and is logged

---

## Audit Trail

Every delegated action is recorded in the `privileged_operation_log`. See [Audit Logs](../05-admin/audit-logs.md).

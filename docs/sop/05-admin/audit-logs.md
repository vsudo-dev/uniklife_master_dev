# Audit Logs

---

## What Are Audit Logs?

Audit logs record every significant action taken on the platform — who did what, when, and on which record.  
Used for security, compliance, and troubleshooting.

---

## What Gets Logged

| Category | Examples |
|----------|---------|
| **System events** | Record created, updated, deleted (triggered by DB) |
| **User events** | Page views, logins, manual actions |
| **Privileged operations** | Support delegation actions, module changes |
| **Auth events** | Login, logout, password reset |

---

## Audit Log Page

Located in the Admin section. Shows a filterable list of all events.

### Tabs
| Tab | Shows |
|-----|-------|
| All | Every log entry |
| System | Database-triggered events only |
| User | User-initiated events only |

### Filters
- **Role** — filter by the actor's role
- **Entity** — filter by the type of record affected
- **Date** — filter by date range

### Columns
| Column | Description |
|--------|-------------|
| Time | When it happened |
| Actor | Who did it (name + role) |
| Action | What was done (e.g. INSERT, UPDATE) |
| Entity | What was affected (e.g. tenant, membership) |
| Details | Expandable — shows before/after values |

---

## Privileged Operation Log

A separate, stricter log for support delegation actions.  
Every action taken under a delegation grant is recorded here with:
- Grant ID used
- Action performed
- Timestamp
- Result (success / failure)

---

## Log Retention

Audit logs older than **90 days** are automatically deleted by a scheduled database job.  
Privileged operation logs are retained longer for compliance.

---

## Who Can View Audit Logs?

| Role | Access |
|------|--------|
| Super Admin | ✅ All tenants |
| Tenant Admin | ✅ Own tenant only |
| Others | ❌ |

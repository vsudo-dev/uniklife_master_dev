# CRM Sync — Overview

---

## What Is CRM Sync?

UNIKLIFE does not store contacts, appointments, or invoices itself. These live in **MyAppz CRM**. 

CRM Sync is the automatic process that copies this data into UNIKLIFE whenever something changes in MyAppz.

---

## How It Works

```
Sales team creates/updates a contact in MyAppz
        ↓
MyAppz automatically sends a webhook (a notification) to UNIKLIFE
        ↓
UNIKLIFE's webhook handler receives it
        ↓
Checks: Is this contact tagged correctly?  (contact events only)
        ↓ Yes                              ↓ No
   Save to contacts table              Skip — do not save
        ↓
Data is now available in UNIKLIFE UI
```

The same flow applies for appointments and invoices (without the tag check).

---

## What Gets Synced

| Data Type | Source in MyAppz | Where It Goes in UNIKLIFE |
|-----------|-----------------|--------------------------|
| Contacts | Contacts module | `contacts` table |
| Appointments | Calendar / Bookings | `crm_appointments` table |
| Invoices | Billing module | `crm_invoices` table |
| Documents | Contact Documents | Viewed via MyAppz link |

---

## What Does NOT Sync

These stay fully in MyAppz — UNIKLIFE does not duplicate them:
- Campaigns and automations
- Courses and community
- Pipeline / deals
- Email / SMS conversations

---

## Multi-Tenant Mapping

Each tenant in UNIKLIFE is mapped to a **sub-account** in MyAppz via a `crm_location_id`.

When a webhook arrives, UNIKLIFE reads the `locationId` in the payload and finds the matching tenant. This means:
- Multiple tenants can use the same MyAppz instance
- Each tenant's data stays isolated
- If `locationId` is not mapped → webhook is acknowledged but ignored

---

## Real-Time vs Polling

CRM Sync is **real-time via webhooks** — no scheduled polling.
- When something changes in MyAppz → UNIKLIFE is notified within seconds
- No manual refresh needed in the UI
- If a webhook fails (e.g. network issue), MyAppz retries automatically

---

## CRM Adapter Rule

All CRM data access in the UNIKLIFE codebase goes through the `src/lib/crm/` adapter layer.  
No page reads directly from MyAppz. This ensures that when UNIKLIFE builds its own CRM in the future, the UI pages need zero changes.

# Billing & Invoices

---

## Where Do Invoices Come From?

Invoices are created and managed in **MyAppz CRM**.  
UNIKLIFE mirrors them via webhook sync for visibility. MyAppz is the source of truth.

> To create a new invoice → go to MyAppz.  
> To view invoices → use UNIKLIFE Billing page.

---

## Billing Page

Shows all invoices for the tenant.

| Column | Description |
|--------|-------------|
| Invoice # | Invoice number from MyAppz |
| Client | Contact linked to the invoice |
| Amount | Total invoice amount |
| Currency | INR (default) or other |
| Status | Draft / Sent / Paid / Overdue / Cancelled |
| Due Date | Payment due date |
| Paid Date | Date payment was received |

---

## Invoice Statuses

| Status | Meaning |
|--------|---------|
| draft | Created but not yet sent to client |
| sent | Sent to client, awaiting payment |
| paid | Payment received |
| overdue | Past due date, not paid |
| cancelled | Cancelled |

---

## Revenue Dashboard (Reports Page)

The Reports page shows revenue KPIs pulled from CRM invoices:
- Total revenue (this month)
- Paid vs unpaid
- Overdue invoices count

See [Reports](reports.md).

---

## Invoices on Client Profile

When you open a client's profile, the billing section shows only their invoices.  
Linked by `contact_id` from the CRM mirror.

---

## Important Notes

- **Do not create invoices in UNIKLIFE** — create in MyAppz only
- Currency defaults to INR. If your tenant uses a different currency, it must be set in MyAppz
- If an invoice is missing for a client, check that the contact is tagged and synced

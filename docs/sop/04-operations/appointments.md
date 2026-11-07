# Appointments

---

## Where Do Appointments Come From?

Appointments are created and managed in **MyAppz CRM** (not in UNIKLIFE directly).  
UNIKLIFE mirrors them via webhook sync. MyAppz is the source of truth.

> To book a new appointment → go to MyAppz calendar.  
> To view appointments → use UNIKLIFE Appointments page.

---

## Appointments Page

Shows all appointments for the tenant, pulled from the CRM mirror table.

| Column | Description |
|--------|-------------|
| Client | Contact name linked to the appointment |
| Title | Appointment type / service name |
| Date & Time | Scheduled date and time |
| Status | scheduled / confirmed / cancelled / no_show |
| Calendar | Which calendar in MyAppz it belongs to |
| Staff | Assigned practitioner/staff |

---

## Appointment Statuses

| Status | Meaning |
|--------|---------|
| scheduled | Booked but not yet confirmed |
| confirmed | Confirmed by staff or client |
| cancelled | Cancelled |
| no_show | Client did not attend |

---

## Filtering Appointments

- Filter by date range
- Filter by status
- Search by client name

---

## Appointments on Client Profile

When you open a client's profile, the **Appointments** tab shows only their appointments.  
These are read from the CRM — no separate booking system in UNIKLIFE.

---

## Dashboard — Today's Appointments

The tenant dashboard shows today's appointments count pulled from the CRM mirror.  
Refreshes automatically.

---

## Important Notes

- **Do not book appointments in UNIKLIFE** — book in MyAppz only
- If an appointment is missing in UNIKLIFE, check if the contact is tagged and synced (see [Contact Tag Filter](../02-crm-sync/contact-tag-filter.md))
- If the client name shows blank on an appointment, the contact is not yet synced

# Data Links — Contacts as the Hub

---

## Contacts Is the Central Table

Everything in UNIKLIFE links back to the `contacts` table.

```
contacts (the hub)
    ├── crm_appointments   → linked by contact_id
    ├── crm_invoices       → linked by contact_id
    └── wellness_clients   → linked by contact_id (optional)
            ├── health_assessments
            ├── body_progress
            ├── care_plans
            ├── nutrition_logs
            ├── meal_plans
            └── program_enrollments
```

---

## Why This Matters

If a contact is **not in the contacts table**, nothing else can link to them:

| Scenario | Result |
|----------|--------|
| Contact not tagged → not synced | Appointments and invoices for that person won't appear anywhere in UNIKLIFE |
| Contact synced (tagged) | Appointments and invoices show on their profile |
| Contact synced + wellness profile activated | Full health tracking available |

---

## Contact vs Wellness Client

| | Contact | Wellness Client |
|---|---------|----------------|
| Where it comes from | MyAppz CRM (auto-synced) | Activated manually by a practitioner |
| What it contains | Name, email, phone, city | Health assessments, care plans, nutrition |
| Required? | Yes — must exist first | No — optional layer on top of a contact |
| Who creates it | CRM sync (automatic) | Practitioner clicks "Activate Wellness Profile" |

---

## Appointment Linking

When an appointment webhook arrives:
1. UNIKLIFE looks up the contact by `crm_contact_id`
2. If found → appointment is linked to that contact (`contact_id` set)
3. If not found (contact not synced yet) → appointment is stored with `contact_id = null`

If the contact later gets tagged and syncs, **the appointments do not automatically re-link**.  
Best practice: tag the contact BEFORE booking appointments.

---

## Invoice Linking

Same as appointments — invoices link to contacts via `contact_id`.  
If contact is not in UNIKLIFE, the invoice is stored but not visible on any client profile.

---

## Appointment & Invoice Tabs on Client Profile

When you open a client's profile in UNIKLIFE:
- **Appointments tab** shows only appointments where `contact_id` matches this contact
- **Billing tab** shows only invoices where `contact_id` matches this contact
- Both read from the CRM mirror tables (`crm_appointments`, `crm_invoices`) — not from a separate booking system

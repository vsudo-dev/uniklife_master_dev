# Clients

---

## Two Layers: Contact + Wellness Profile

Every client in UNIKLIFE has two layers:

### Layer 1 — Contact (always exists)
- Synced automatically from MyAppz CRM
- Contains: name, email, phone, city
- Required before anything else can happen

### Layer 2 — Wellness Profile (optional)
- Activated manually by a practitioner
- Unlocks: health assessments, body progress, care plans, nutrition, programs
- One contact can have only one wellness profile

---

## Clients Page

The Clients page shows all contacts synced from MyAppz for that tenant.

| Column | Source |
|--------|--------|
| Name | Contact first name + last name |
| Email | Contact email |
| Phone | Contact phone |
| Status | Active / Inactive |

---

## Viewing a Client

Click **View** on any client row to open their profile.

**Without a wellness profile:**
- Shows contact details (name, email, phone)
- Shows appointments from CRM
- Shows an **"Activate Wellness Profile"** button

**With a wellness profile:**
- Full 7-tab view:
  1. Overview
  2. Assessments
  3. Progress
  4. Care Plans
  5. Programs
  6. Appointments
  7. Nutrition

---

## Activating a Wellness Profile

1. Open the client's profile
2. Click **Activate Wellness Profile**
3. A wellness record is created linked to this contact
4. The 7-tab view unlocks immediately

> This can only be done once per contact. If you accidentally click it again, nothing happens (safe — no duplicates created).

---

## Who Can Activate?

- Practitioner
- Tenant Admin

---

## Deactivating a Client

Changing a client's status to **Inactive** does not delete their data. It hides them from the active client list but all records are preserved.

---

## Search & Filter

- Search by name, email, or phone
- Filter by status (active / inactive)

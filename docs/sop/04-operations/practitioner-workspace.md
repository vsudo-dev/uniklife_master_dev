# Practitioner Workspace

---

## What Is the Practitioner Workspace?

The Practitioner Workspace is the daily command centre for a practitioner.  
It shows what's happening today and gives quick access to client actions.

> Only visible to users with the **Practitioner** role.

---

## Three Sections

### 1. Daily Schedule

A timeline view of today's appointments.

| Column | Description |
|--------|-------------|
| Time | Appointment time |
| Client | Client name |
| Service | Type of appointment |
| Status | Scheduled / Confirmed / Cancelled |

- Sorted chronologically
- Shows only appointments assigned to this practitioner
- Auto-refreshes every 60 seconds

### 2. Client Queue

A list of clients who are expected today or awaiting attention.

- Shows clients with appointments today
- Quick link to open each client's profile
- Useful for pre-session preparation

### 3. Quick Notes

A fast way to add a note for a client without opening their full profile.

- Select a client from the dropdown
- Type the note
- Save — note is attached to the client's record

---

## Navigating to the Workspace

After login as a Practitioner:
- You are routed to the workspace automatically
- Or navigate to: `/t/{slug}/workspace`

---

## Workspace vs Full Client Profile

| Use Workspace For | Use Client Profile For |
|-------------------|----------------------|
| Quick overview of today | Detailed client history |
| Adding a quick note | Adding assessments, care plans |
| Seeing your schedule | Reviewing nutrition, programs |

---

## Data Source

- Schedule: reads from `crm_appointments` (CRM mirror) for today's date
- Queue: derived from today's appointments
- Notes: saved to our Supabase `client_notes` table

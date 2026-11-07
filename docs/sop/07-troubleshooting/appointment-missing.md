# Troubleshooting: Appointment Missing in UNIKLIFE

---

## Symptom

An appointment was booked in MyAppz but does not appear on the UNIKLIFE Appointments page or the client's profile.

---

## Diagnosis

### 1. Check if the Appointment Shows on the Appointments Page

Go to `/t/{slug}/appointments` and check if the appointment is listed (even without a client name).

**If listed but no client name:**
- The appointment is synced but the contact is not linked
- The contact is likely not tagged → not in UNIKLIFE
- Fix: tag the contact in MyAppz → they sync → future appointments will link
- The already-synced appointment will not auto-link retroactively

**If not listed at all:**
- The webhook was not received — go to Step 2

---

### 2. Check the Webhook Configuration

- In MyAppz, go to **Settings → Webhooks**
- Confirm a webhook exists for **Appointment Created** and **Appointment Updated** events
- Check delivery history for errors

---

### 3. Check the Location Mapping

The MyAppz sub-account must be mapped to the tenant.  
See [Contact Not Appearing](contact-not-appearing.md) Step 3.

---

### 4. Check the Date Filter

The Appointments page may be filtered to a specific date range.  
Make sure the appointment date is within the visible range.

---

### 5. Appointment for Today Not on Dashboard?

The dashboard shows today's appointments only.  
- Check the appointment's `scheduled_at` is today's date in the correct timezone
- If the time is in UTC and your timezone is IST (+5:30), a midnight IST appointment may appear as yesterday in UTC

---

## Still Missing?

Ask the Super Admin to check the Supabase Edge Function logs:
- Dashboard → Edge Functions → `crm-webhook` → Logs
- Look for `skipped: tenant_not_mapped` or any error for the appointment event

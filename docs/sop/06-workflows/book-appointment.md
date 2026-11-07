# Workflow: Book an Appointment

---

## Important

Appointments are booked in **MyAppz**, not in UNIKLIFE.  
UNIKLIFE shows appointments — it does not create them.

---

## Steps to Book an Appointment

1. Open **MyAppz CRM** (`login.uniklife.ai`)
2. Go to the **Calendar** section
3. Click on the time slot
4. Select the client (contact)
5. Choose the service / appointment type
6. Assign a practitioner (optional)
7. Confirm and save

---

## After Booking

- MyAppz sends a webhook to UNIKLIFE automatically
- The appointment appears on the UNIKLIFE **Appointments page** within seconds
- It also appears on the client's profile under the **Appointments** tab
- Today's appointments update on the **Dashboard** and **Practitioner Workspace**

---

## If the Appointment Does Not Appear in UNIKLIFE

1. Check if the contact is synced (see [Contact Not Appearing](../07-troubleshooting/contact-not-appearing.md))
2. If the contact is not in UNIKLIFE, the appointment will be stored but not linked to any client
3. Fix: tag the contact in MyAppz → they sync → the future appointments will link correctly

> Past appointments already in the mirror table will not auto-link retroactively.

---

## Rescheduling or Cancelling

- Reschedule or cancel in **MyAppz**
- UNIKLIFE will receive an `appointment.updated` webhook
- The status and time update in UNIKLIFE automatically

---

## Appointment Types

Appointment types (services) are configured in MyAppz calendar settings.  
UNIKLIFE displays whatever title is in the MyAppz payload.

# Workflow: Raise an Invoice

---

## Important

Invoices are created in **MyAppz**, not in UNIKLIFE.  
UNIKLIFE shows invoices — it does not create them.

---

## Steps to Raise an Invoice

1. Open **MyAppz CRM** (`login.uniklife.ai`)
2. Go to **Billing** or **Payments**
3. Click **New Invoice**
4. Select the client (contact)
5. Add line items (services, products)
6. Set due date
7. Save as **Draft** or **Send** immediately to the client

---

## After Raising

- MyAppz sends a webhook to UNIKLIFE automatically
- The invoice appears on the UNIKLIFE **Billing page** within seconds
- It also appears on the client's profile

---

## Marking as Paid

1. When payment is received, go to MyAppz
2. Open the invoice
3. Click **Record Payment**
4. UNIKLIFE receives an `invoice.updated` webhook
5. The invoice status updates to **Paid** in UNIKLIFE automatically

---

## If an Invoice Does Not Appear in UNIKLIFE

1. Check if the contact is synced in UNIKLIFE
2. If not synced, the invoice is stored but not linked to a client profile
3. Fix: tag the contact → they sync → future invoices link correctly

---

## Revenue Reports

Paid invoices feed into the **Reports page** revenue KPIs automatically.  
No manual entry needed.

---

## Currency

- Default currency is **INR**
- If your tenant uses a different currency, it must be configured in MyAppz
- UNIKLIFE displays whatever currency is in the invoice payload

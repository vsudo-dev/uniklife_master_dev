# Contact Tag Filter

---

## Why Does This Exist?

MyAppz sub-accounts often contain contacts from multiple sources:
- Event attendees
- Professional networking contacts
- Leads from campaigns
- Actual wellness clients

Without a filter, **all of these** would flood the UNIKLIFE Clients page.

The Tag Filter ensures only the right contacts appear in UNIKLIFE.

---

## How It Works

Each tenant has a **CRM Contact Tag** setting (e.g. `test_healthy-fitness`).

When a contact is created or updated in MyAppz:

```
Contact created/updated in MyAppz
        ↓
Webhook sent to UNIKLIFE
        ↓
Does this contact have the required tag?
        ↓ Yes                        ↓ No / No tags at all
   Sync to UNIKLIFE              Skip — not saved
```

---

## Sales Team Workflow

**Correct process when adding a new client:**

1. Create the contact in MyAppz (name, phone, email)
2. **Add the tag** `test_healthy-fitness` to the contact
3. UNIKLIFE receives the update and syncs the contact
4. Contact appears on the Clients page

> If you forget the tag at step 2, the contact will NOT appear in UNIKLIFE.  
> Fix: Go back to MyAppz, add the tag → UNIKLIFE will sync automatically.

---

## What If the Tag Was Added Later?

No problem. When you add the tag to an existing contact:
- MyAppz fires a `contact.updated` webhook
- UNIKLIFE receives it, sees the tag is now present
- Contact is synced and appears in UNIKLIFE

---

## Does the Tag Filter Apply to Appointments and Invoices?

**No.** The tag filter is only for contact events.

- Appointments and invoices do not have tags in their webhook payloads
- If a contact is NOT in UNIKLIFE (never tagged), their appointments/invoices are stored but not linked — they won't appear on any client's profile
- Once the contact is tagged and syncs, everything links up automatically

---

## Per-Tenant Tags

Each tenant configures their own tag. Example:

| Tenant | CRM Contact Tag |
|--------|----------------|
| Healthy Lifestyle | `test_healthy-fitness` |
| Future Tenant B | `uniklife-tenant-b` |

This means multiple tenants can share the same MyAppz instance without their contacts mixing.

---

## Known Limitation — Tag Removal Does Not Remove Contact

**Issue:** When a tag is removed from a contact in MyAppz, the contact is **not removed** from UNIKLIFE.

**Root cause:** MyAppz CRM does not send a webhook event when a tag is removed from a contact. Our webhook only fires on contact create/update with tag data — not on tag deletion.

**Status:** Reported to CRM developers. Pending fix on their side.

**Workaround (until CRM fix):** Manually deactivate the client in UNIKLIFE if they should no longer appear.

**Future action:** Once CRM developers confirm tag-removal webhooks are supported, we need to add a handler that removes or deactivates the contact when the required tag is no longer present.

---

## Who Configures the Tag?

The Super Admin sets `crm_contact_tag` on the tenant record.  
The sales team only needs to know **which tag to apply** in MyAppz when creating a client.

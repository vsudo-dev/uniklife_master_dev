# Troubleshooting: Contact Not Appearing in UNIKLIFE

---

## Symptom

A contact was created in MyAppz but does not appear on the UNIKLIFE Clients page.

---

## Step-by-Step Diagnosis

### 1. Check the Tag
> This is the most common cause.

- Open the contact in MyAppz
- Look at the **Tags** section
- Is the tag `test_healthy-fitness` (or the tenant's configured tag) present?

**If the tag is missing:**
- Add the tag
- Wait a few seconds
- The contact will appear in UNIKLIFE automatically

---

### 2. Check the Webhook Is Configured

The MyAppz sub-account must have a webhook pointing to the UNIKLIFE endpoint.

- In MyAppz, go to **Settings → Webhooks**
- Confirm a webhook exists for Contact Created and Contact Updated events
- The URL should be: `https://<project>.supabase.co/functions/v1/crm-webhook`

If no webhook exists, contact the Super Admin to configure it.

---

### 3. Check the Location Mapping

The MyAppz sub-account must be mapped to a tenant in UNIKLIFE via `crm_location_id`.

- Ask the Super Admin to verify the tenant's `crm_location_id` matches the sub-account ID in MyAppz

---

### 4. Check the Contact Was Updated After Tagging

If you created the contact and added the tag in two separate steps, the tag addition triggers a `contact.updated` webhook. Wait 5–10 seconds after adding the tag.

---

## Still Not Appearing?

| Check | How |
|-------|-----|
| Webhook delivery logs | In MyAppz, go to Settings → Webhooks → check delivery history for errors |
| Supabase Edge Function logs | Super Admin checks Supabase dashboard → Edge Functions → crm-webhook → Logs |
| Contact ID conflict | Check if the same `crm_contact_id` already exists for another record |

---

## Contacts That Were Already in UNIKLIFE Before the Tag Filter Was Set Up

Existing contacts that synced before the tag filter was added are not removed.  
Only new events are filtered. Those contacts remain as-is.

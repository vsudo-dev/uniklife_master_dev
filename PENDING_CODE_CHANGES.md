# Pending Code Changes

Issues and code changes tracked here — waiting on external fixes or future decisions.
Update this file when each item is resolved.

---

## [OPEN] CRM Tag Removal Does Not Remove Contact from UNIKLIFE

**Reported:** 2026-11-06  
**Filed with:** MyAppz CRM developers  
**Priority:** Medium  

### What happens
When a tag is removed from a contact in MyAppz:
1. The contact detail page shows the tag as removed ✅
2. BUT the contact LIST in MyAppz still shows the tag — meaning the CRM backend did not actually save the removal
3. Because the backend still has the tag, no `contact.updated` webhook fires to UNIKLIFE
4. UNIKLIFE never receives the update → contact remains visible on the Clients page

### Root cause
CRM-side bug — tag removal on the contact detail page does not persist to the CRM backend. The UI shows it removed but the data is not saved. No webhook fires because nothing changed in the backend.

### Our code status
Working correctly. The toggle and webhook handler are ready:
- **Safe mode (current):** contacts with no tags in payload are synced — handles CRM webhook gaps
- **Strict mode (ready to flip ON):** contacts without the required tag are skipped

### What to do when CRM fixes it
1. Confirm the fix: remove a tag in MyAppz → verify the contact LIST also shows the tag removed
2. Create a contact, add the tag, then remove it → check Supabase Edge Function logs for a `contact.updated` webhook with `found: []`
3. If webhook fires correctly → go to **Settings → CRM Sync Settings** in UNIKLIFE and flip **Tag Filter Mode** to Strict
4. No code change needed — the toggle handles it

**File that will change (if any):** None — toggle in UI is sufficient.

---

## [OPEN] Appointment-Contact Retroactive Linking

**Reported:** 2026-11-06  
**Priority:** Low  

### What happens
If an appointment is booked in MyAppz for a contact that is not yet synced to UNIKLIFE:
- The appointment is stored in `crm_appointments` with `contact_id = null`
- When the contact later gets tagged and syncs, the existing appointment does not auto-link

### What to do
Decide: do we need a backfill script, or is "tag contact before booking" the enforced workflow?  
If backfill needed → write a one-time migration or RPC that sets `contact_id` on `crm_appointments` where `crm_contact_id` matches a now-synced contact.

**File that will change:** `supabase/migrations/<timestamp>_backfill_appointment_contact_link.sql`

---

## [FUTURE] Super Admin "View As" — Full Role Simulation

**Reported:** 2026-11-07  
**Priority:** Medium — owner-approved deferral  

### What exists today
The eye icon on the Tenants page lets a super admin navigate into a tenant as a chosen role (Admin, Practitioner, Staff, Customer Portal). The amber banner shows the active view mode, and Exit returns to the page they came from.

### What doesn't work yet
The sidebar nav and page content do not fully reflect the chosen role because:
1. Super admin's own `tenant_memberships` row (usually `tenant_admin`) takes precedence over the view mode role in `TenantShell.tenantRole` computation
2. Data scoping is not enforced — pages show super_admin's full data view, not what a practitioner or staff member would see
3. Customer Portal eye icon on the Clients page is working (contact-scoped portal data), but tenant-level role simulation (Admin/Practitioner/Staff) is cosmetic navigation only

### What full role simulation requires
- In `TenantShell`: when `viewMode` is active, bypass the `memberships.find()` lookup and use `viewMode.role` directly
- Pages with role-gated sections (e.g. finance tab only for admin) need to read `viewMode.role` instead of the membership role
- Optionally: use Supabase's `SET LOCAL role` or a super admin service-role proxy to simulate RLS as the picked role

### Files that will change
- `src/components/tenant-shell.tsx` — `tenantRole` logic: check `viewMode?.role` first when in view mode
- `src/hooks/use-auth.ts` — expose `effectiveRole` selector that uses `viewMode.role` when active
- Any page that gates content by `activeRole` or `tenantRole`

---

## [FUTURE] Swap CRM Mirror Tables to Own CRM (Stage 3)

**Priority:** Low — long term  

### What happens
Currently `crm_appointments` and `crm_invoices` are mirror tables synced from MyAppz.  
In Stage 3, UNIKLIFE builds its own CRM and these tables become the source of truth.

### What to do
When Stage 3 begins:
- Remove webhook sync for appointments and invoices
- Update `src/tenant/appointments-page.tsx` and `src/tenant/billing-page.tsx` to read from own tables
- The CRM adapter layer (`src/lib/crm/`) handles the swap — UI pages need zero changes

**Files that will change:** `src/lib/crm/appointments.ts`, `src/lib/crm/billing.ts`

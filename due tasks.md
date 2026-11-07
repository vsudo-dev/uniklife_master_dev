# UNIKLIFE.AI — Due Tasks & Pending Work
Last updated: 2026-11-05

---

## ✅ Completed (Phases 0–5 + Phase 10 partial)

- Phase 0 — Architecture Blueprint
- Phase 1 — Foundation (DB, Auth, Tenants, Branches, Memberships, Delegation, Audit)
- Phase 2 — Module Engine (56 modules, entitlements, dependency validation)
- Phase 3 — White-Label & Navigation (branding, role-based nav, shells)
- Phase 4 — Wellness Core (health assessments, body progress, care plans, nutrition)
- Phase 5A — Practitioner Workspace
- Phase 5B — Finance Core (invoices, payments, revenue)
- Phase 5C — Staff Management
- Phase 5D — Reports & Analytics
- Phase 5E — Multi-Branch Operations
- Phase 5F — Progress Reviews & Goal Tracking
- Phase 10 (partial) — CRM Adapter (src/lib/crm/, 3 hooks, Clients/Appointments/Billing rewired)
- Auth — Password reset flow (/auth/reset page)
- Audit — Frontend activity logger (log_user_activity RPC + usePageView hook)
- Audit — Redesigned UI (3 tabs, filters, inline expand, actor name)
- Audit — 90-day auto-cleanup cron (pg_cron)
- Audit — Fixed actor_role always NULL bug (trigger + backfill migration)

---

## 🔄 In Progress

### Nav Bug Fix (TODAY — approved)
- [ ] Fix `getNavForRole()` context — super_admin inside `/t/` sees Platform Nav instead of Tenant Nav
- [ ] Add `context: 'tenant'` parameter to TenantShell call

### Phase 10 — CRM Adapter (remaining)
- [ ] Verify Clients / Appointments / Billing pages load live MyAppz data
- [ ] Adjust table/column names if MyAppz schema differs
- [ ] Redirect Documents page to MyAppz `contact_documents`

---

## ⏳ Pending — In Order

### Phase 6 — Customer Portal (NEXT after nav fix)
- [ ] Patient login and home screen
- [ ] View own body progress (weight, BMI charts)
- [ ] View meal plan and nutrition diary
- [ ] View care plan
- [ ] Book appointments
- [ ] Habit check-ins
- [ ] Installable as PWA

### Support Ops Shell (Phase 10 scope)
- [ ] Dedicated `/support/` shell for support_ops role
- [ ] List of delegated tenants
- [ ] Action request queue (approve / deny)

### Phase 7 — Automations
- [ ] Appointment reminders via MyAppz workflows
- [ ] Post-session follow-up messages
- [ ] Re-engagement alerts for inactive clients

### Phase 8 — AI Layer
- [ ] AI wellness coach
- [ ] Smart meal plan suggestions
- [ ] Assessment analysis for practitioners

### Phase 9 — Reporting & Analytics
- [ ] Wellness outcome dashboards
- [ ] Revenue trends
- [ ] Coach performance metrics

### Phase 12 — QA & Pilot
- [ ] E2E tests
- [ ] Security review
- [ ] Onboard first real tenant (MTML)
- [ ] Owner go-live approval

### Phase 13 — Own CRM (Long Term)
- [ ] Build own CRM from scratch
- [ ] Swap CRM Adapter from MyAppz to own CRM
- [ ] Disconnect MyAppz

---

## 🔮 Future Considerations (not in current plan)
- 6th role level: Org Admin (for multi-business scale — Stage 2)
- Developer team shell (separate from support_ops)

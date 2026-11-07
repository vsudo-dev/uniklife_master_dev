# UNIKLIFE.AI — Claude Code Project Instructions

## Project
UNIKLIFE.AI: Multi-tenant, multi-industry, white-label SaaS Business Operating System.
First vertical: Weight Loss & Wellness OS (WellnessOS).
Future verticals: Real Estate, Finance, Education — same platform core, different modules.

## Strategy (Owner Approved 2026-11-02)
Read `docs/VISION_AND_STRATEGY.md` before any strategic or architectural work.

**3-Stage plan:**
- Stage 1 (Now): Build UNIKLIFE.AI platform + connect to MyAppz CRM (login.uniklife.ai / myappzbackend.com) as the CRM backbone for contacts, bookings, billing, campaigns, and automations
- Stage 2 (After launch): Stable operations on MyAppz + keep improving wellness layer
- Stage 3 (Long term): Build own CRM from scratch, replace MyAppz, full independence

**CRM Adapter rule:** All MyAppz API calls go through `src/lib/crm/` adapter layer only. UI pages never call MyAppz directly. This ensures swapping to own CRM in Stage 3 requires zero UI changes.

**Database split:**
- Our Supabase = Platform & Wellness data (owned forever — never delegate to MyAppz)
- CRM mirror tables (contacts, appointments, invoices) go idle once adapter is live — do NOT delete them

## Stack
- Frontend: React + TypeScript + Vite
- UI: shadcn/ui + Tailwind CSS
- State: TanStack Query + Zustand
- Backend: Supabase Edge Functions (Deno). Cloudflare Workers for static hosting later.
- Database: Supabase PostgreSQL with RLS
- Auth: Supabase Auth
- Storage: Supabase Storage (private buckets for health data)
- Future hosting: Cloudflare Workers with Static Assets

## Rules
- Read `docs/ARCHITECTURE_v2.md` before any structural changes
- Never hard-code tenant IDs, Supabase URLs, or API keys
- All migrations go in `supabase/migrations/` with timestamps
- RLS on every tenant-owned table — no exceptions
- Health data tables get stricter access policies than business data
- No code changes without phase approval from owner
- Run `npm run typecheck && npm run lint` before reporting task complete

## Strict Rule — Suggest Before Writing Code
**NEVER auto-write code.** For every task:
1. Present the plan first — which files, what changes, why
2. Wait for explicit owner approval ("yes", "go ahead", "proceed", "build it")
3. Only then write code

Exception: if the owner says "build it" or "do it" in the same message as the request, that counts as pre-approval.

## Developer Conduct Rules
- **Major changes or deletions require explicit owner approval** — before deleting any file, table, migration, or making a breaking structural change, stop and ask the owner why it is necessary and wait for a yes before proceeding. Never assume permission.
- **Act as a senior developer** — after every development task: (1) audit the change for correctness, security, and side-effects; (2) run or suggest tests; (3) debug any issues found; (4) suggest the best next step or improvement. Do not mark a task complete without this review pass.

## API Keys — Strict Rule
**NEVER ask the owner for API keys in chat.** Keys are secrets — they do not belong in conversation.
- Always write code with `.env` placeholder variables
- Tell the owner exactly which file to open and which variable to paste the key into
- The `.env` file is gitignored — that is the only place keys go
- If a key is missing, write the code anyway and leave a `# PASTE KEY HERE` comment in `.env.example`

## Mandatory Workflow — Update These Files After Every Task

After completing any development task, ALWAYS update all four of these before marking done:

| File | What to Update |
|------|----------------|
| `CLAUDE.md` | Phase gate, exit criteria checkboxes, current phase if it changed |
| `LOGBOOK.md` | New versioned entry — full detail (migration, hooks, types, UI, bugs fixed). Verify project identity guard before writing. |
| `VERSION_HISTORY.md` | New row in summary table + migration log row if applicable. Verify project identity guard before writing. |
| `docs/PHASES.md` | Mark completed milestones ✅, update phase status header |

**This is not optional.** A task is NOT complete until all four files reflect the work.
**Project identity check:** Before writing to LOGBOOK.md or VERSION_HISTORY.md, read the PROJECT IDENTITY GUARD comment at the top and confirm `Repo path` matches your current working directory. If it does not match — STOP.
**Timestamp format:** `YYYY-MM-DD HH:MM IST` on every LOGBOOK entry.

## Phase Gate
Current phase: **Phase 6 — Customer Portal**
Phases 0–5 + Phase 10 (CRM Integration) complete as of 2026-11-06.
Do NOT start Phase 7 (Automations) until Phase 6 exit criteria pass and owner approves.
If asked to work on Phase 7+ scope while Phase 6 is open, refuse and list the specific Phase 6 criteria still incomplete.

## Phase 1 Exit Criteria
All of the following must be true before Phase 2 can start. Owner must explicitly approve the exit.

### Database & Migrations
- [x] Migration `20261028_001_phase1_foundation.sql` applied — confirmed via `supabase migration list`
- [x] Migration `20261029_002_fix_branch_assign_policy.sql` applied — confirmed via `supabase migration list`
- [x] All Phase 1 tables live in Supabase — confirmed via `pg_tables` query (45 tables total, all Phase 1 tables present)
- [x] RLS enabled on ALL tables — confirmed via `pg_tables.rowsecurity = true` for every table
- [x] Identity resolution functions deployed: `platform_user_id()`, `active_tenant_ids()`, `tenant_role()`, `is_super_admin()`, `has_branch_access()` — confirmed via `information_schema.routines`
- [x] `handle_new_user()` trigger live on `auth.users` — confirmed
- [x] `promote_super_admin()` trigger live on `platform_users` — confirmed

### Auth & Identity
- [x] `handle_new_user` auto-creates `platform_users` on signup — trigger confirmed live (P1 passed)
- [x] `promote_super_admin` sets `platform_role = 'super_admin'` for designated email — trigger confirmed live
- [x] UNIQUE constraint on `platform_users.auth_user_id` enforces one row per human — constraint live

### Tenant & Branch Operations
- [x] Super Admin sees all tenants — P1 passed
- [x] Tenant Admin sees own tenant — P2 passed
- [x] Practitioner sees own tenant branches — P3 passed
- [x] Customer sees own membership — P4 passed
- [x] Branch assignment grant created — P5 passed
- [x] Branch assignment revoke denies access immediately — N13 passed

### Support Delegation
- [x] Delegation grant created by Super Admin — P5 passed
- [x] `grantee ≠ grantor` CHECK enforced — N20, N23b passed
- [x] `NULL expires_at` rejected — NOT NULL constraint live
- [x] Past `expires_at` rejected — N23a passed
- [x] Revoked grant status confirmed not active — N25 passed
- [x] Non-super_admin cannot create delegation grants — N22 passed
- [x] Self-approve CHECK enforced — N21 passed
- [x] Expired grant denied — `validate_support_grant()` checks `expires_at > now()` + pg_cron flips status hourly
- [x] Support member with no active grant cannot change entitlements — `support-action` Edge Function enforces grant before any privileged write

### Audit
- [x] Audit triggers fire on tenants, memberships, grants, branch_assignments — confirmed live
- [x] Audit log rows captured — P6 passed (audit_logs has ≥2 tenant entries)
- [x] `privileged_operation_log` table live with RLS

### Cross-Tenant Isolation (RLS — all passed in acceptance suite)
- [x] Tenant A sees 0 rows from Tenant B — N7 passed
- [x] Tenant A cannot INSERT into Tenant B's tables — N8, N11 passed
- [x] Cross-tenant branch assignment denied — N9 passed
- [x] Tenant A sees 0 Tenant B branches — N10 passed

### Branch-Scoped Isolation
- [x] Practitioner assigned to Branch X cannot access Branch Y — N12 passed
- [x] Removing assignment immediately denies access — N13 passed

### Health Data Schema Readiness
- [x] Anon gets 0 health log rows — N14 passed
- [x] Customer gets 0 health log rows — N15 passed
- [x] Staff gets 0 health log rows — N16 passed
- [x] Tenant Admin sees own tenant health log — N17 passed

### Privilege Escalation Prevention
- [x] Customer cannot update another customer's record — N18 passed
- [x] Customer cannot self-escalate to tenant_admin — N19 passed
- [x] Self-grant CHECK enforced — N20 passed
- [x] Self-approve CHECK enforced — N21 passed
- [x] Non-super cannot create delegation grant — N22 passed

### Edge Functions
- [x] `support-action` Edge Function deployed — handles all grant types: `module.entitlement.change`, `tenant.config.read/update`, `platform.user.manage`, `tenant.branding.update`, `tenant.membership.manage`
- [x] `validate_support_grant()` RPC deployed — checks status='active', expiry, tenant scope, allowed_actions
- [x] `expire_stale_grants()` pg_cron job scheduled hourly — auto-flips status to 'expired' when expires_at passes
- [x] `requires_approval=true` path: queues to `support_action_requests`, returns pending request_id
- [x] `requires_approval=false` path: executes immediately, writes to `privileged_operation_log`

### Frontend
- [x] `npm run typecheck` — PASSED (zero errors)
- [x] `npm run lint` — PASSED (zero errors)
- [x] Supabase client uses env vars only — no hard-coded values
- [x] `useAuth` hook exposes: `user` (platform_role), `memberships`, `activeRole`, `isAuthenticated`, `isLoading`

# UNIKLIFE.AI — Development Logbook

<!--
  PROJECT IDENTITY GUARD
  ----------------------
  Project  : UNIKLIFE.AI — Multi-tenant Wellness SaaS Platform
  Repo path: /Users/venkatesh/Desktop/prod/uniklife_master_dev
  Owner    : Venkatesh (uniklife01@gmail.com)
  Stack    : React + TypeScript + Vite + Supabase

  BEFORE WRITING ANY ENTRY: verify this file belongs to the project
  you are currently working in. Check the repo path above against
  your working directory. If they do not match, STOP — you are in
  the wrong project's logbook.

  ENTRY FORMAT (required for every entry):
  - Version : vX.Y.Z
  - Date    : YYYY-MM-DD HH:MM IST
  - Author  : Claude (model) + Venkatesh
  - Phase   : Phase N — <name>
  - Sections: Changes, Hooks/Types/Migration (if any), Nav (if any)
-->

## Version History

---

### v10.0.3 — 2026-11-08 04:00 IST — Bug Fix: Wellness Profile Activation ON CONFLICT
**Author:** Claude (Opus 4.6) + Venkatesh
**Phase:** Phase 6 — Customer Portal

#### Root Cause
`useCreateWellnessClient()` used `.upsert(input, { onConflict: "contact_id" })` but the `wellness_clients` table has a composite unique constraint `UNIQUE (tenant_id, contact_id)`, not a single-column one on `contact_id`. PostgreSQL rejected the ON CONFLICT clause.

#### Fix
Changed `onConflict: "contact_id"` → `onConflict: "tenant_id,contact_id"` to match the actual composite unique constraint.

#### Files Modified
| File | Change |
|------|--------|
| `src/hooks/use-wellness-clients.ts` | Fixed `onConflict` parameter to use composite key |

#### E2E Test Result (Task 6.9)
Full customer portal E2E test PASSED with real customer `member@gmail.com` (Sudo Test-6):
- ✅ Customer login at `/portal` — works
- ✅ Auto-link connects contact → auth user on login
- ✅ Wellness profile activates from admin side
- ✅ All 5 portal pages render correctly (Home, Appointments, Health, Progress, Documents)
- ✅ Daily Check-In widget appears on Home
- ✅ All 8 admin client detail tabs work (Overview, Assessments, Progress, Care Plans, Programs, Appointments, Nutrition, Invoices)
- ✅ Empty states shown correctly for new client with no clinical data

#### Verification
- `npm run typecheck` — PASSED (zero errors)
- `npm run lint` — PASSED (zero errors)

---

### v10.0.2 — 2026-11-08 03:00 IST — Bug Fix: Customer Contact Auto-Link Guard
**Author:** Claude (Opus 4.6) + Venkatesh
**Phase:** Phase 6 — Customer Portal

#### Root Cause
`link_customer_account()` RPC only fired when `memberships.length === 0` in `useAuthListener`. If a customer signed up before their CRM contact existed, they got a membership on first login but the RPC returned `no_contact_found`. Once the contact was added via CRM, subsequent logins skipped the RPC because memberships already existed — so `contacts.auth_user_id` was never set. Portal pages (Appointments, Documents) showed "Profile not linked."

#### Fix
Removed the `memberships.length === 0` guard from both linking paths (initial load + `onAuthStateChange`). Now every `tenant_user` login calls the RPC. The RPC is idempotent (`ON CONFLICT DO NOTHING` for membership, safe UPDATE for `auth_user_id`). Membership re-fetch only triggers if memberships were empty before linking.

#### Files Modified
| File | Change |
|------|--------|
| `src/hooks/use-auth.ts` | Removed `memberships.length === 0` guard from both auto-link blocks (lines ~183 and ~227) |

#### Verification
- `npm run typecheck` — PASSED (zero errors)
- `npm run lint` — PASSED (zero errors)

---

### v10.0.1 — 2026-11-08 02:00 IST — Bug Fix: Customer Portal Login Blocked
**Author:** Claude (Opus 4.6) + Venkatesh
**Phase:** Phase 6 — Customer Portal

#### Root Cause
When a customer navigates to `/portal` without being authenticated, `AuthGate` renders the generic `LoginPage`. After successful login, `LoginPage` checks `platform_role` — if not `super_admin` or `support_ops`, it **signs the user out** and shows "This login is for platform administrators only." Customers could never get through.

#### Fix
The admin-only check now applies only when `isPublicRoute` is true (i.e., user accessed `/auth/login` or `/auth/signup` directly). When `LoginPage` is rendered by `AuthGate` (any protected route like `/portal`), all roles are allowed — the shells handle role-based access after login.

#### Files Modified
| File | Change |
|------|--------|
| `src/platform/auth/login-page.tsx` | Admin-only sign-out gated behind `isPublicRoute` check |

#### Checks
- `npm run typecheck` — PASSED
- `npm run lint` — PASSED

---

### v10.0.0 — 2026-11-08 01:30 IST — Delegation Workflow: End-to-End Security Fix
**Author:** Claude (Opus 4.6) + Venkatesh
**Phase:** Phase 6 — Customer Portal (delegation security overhaul)

#### Root Cause Analysis
Deep audit revealed 4 fundamental bugs in the delegation workflow:
1. **Submit Request bypassed Edge Function** — `useCreateActionRequest` inserted directly into DB, skipping grant validation (status, expiry, allowed_actions). Any user with INSERT RLS could create requests.
2. **Grant dropdown showed all users' grants** — Support Ops could see and select grants belonging to other users.
3. **No post-approval execution** — Approve button only changed status to "approved" in DB. Nothing actually executed the action. The approved request sat idle forever.
4. **Stuck test requests** — SuperAdmin had created test requests (from old UI). Self-approve DB CHECK (`reviewer_id != requester_id`) correctly blocked review, but left orphaned pending rows.

#### Architecture Fix

**Before (broken):**
```
Support Ops → Direct DB INSERT → pending row
Super Admin → Direct DB UPDATE (status=approved) → nothing happens
```

**After (correct):**
```
Support Ops → support-action Edge Function → validates grant → queues (or executes if no approval needed)
Super Admin → review-action Edge Function → validates super_admin → updates status → executes action → audit log
```

#### Changes

**New Edge Function: `supabase/functions/review-action/index.ts`**
- Verifies caller is `super_admin`
- Validates request is `pending` and reviewer != requester
- If rejected: updates status, done
- If approved: updates status → executes action via `executeAction()` → sets `executed_at` → writes `privileged_operation_log`
- Same `executeAction()` logic as `support-action` (handles all 6 permission keys)

**Modified Edge Function: `supabase/functions/support-action/index.ts`**
- Now stores `payload` JSONB when queuing requests (needed for execution at approval time)

**Migration: `20261119_001_action_request_payload.sql`**
- Adds `payload JSONB` column to `support_action_requests`
- Cleans up stuck test requests created by SuperAdmin

**Frontend hooks: `src/hooks/use-action-requests.ts`**
- `useSubmitAction()` replaces old `useCreateActionRequest()` — calls `support-action` Edge Function
- `useReviewActionRequest()` now calls `review-action` Edge Function instead of direct DB update
- Old direct-insert hook removed entirely

**Submit Request dialog: `src/platform/delegation/create-action-request-dialog.tsx`**
- Filters grants to `grantee_user_id === currentUser.id` (only your own grants)
- Shows "no grants" empty state if user has no active grants
- Auto-fills tenant when grant has `tenant_scope_id` (scoped grants lock to their tenant)
- Removed `expires_in_hours` field (Edge Function sets 24h automatically)
- Routes through Edge Function for full grant validation

**Approval Queue: `src/platform/delegation/action-requests-section.tsx`**
- Shows "Executed" timestamp after approval (from `executed_at` column)

**Types: `src/types/delegation.ts`**
- Added `payload` field to `SupportActionRequest` interface

#### Files Modified
| File | Change |
|------|--------|
| `supabase/functions/review-action/index.ts` | NEW — Super Admin review + auto-execute Edge Function |
| `supabase/functions/support-action/index.ts` | Stores payload when queuing |
| `supabase/migrations/20261119_001_action_request_payload.sql` | NEW — payload column + test data cleanup |
| `src/hooks/use-action-requests.ts` | Rewritten — both hooks route through Edge Functions |
| `src/platform/delegation/create-action-request-dialog.tsx` | Rewritten — own grants only, Edge Function routing |
| `src/platform/delegation/action-requests-section.tsx` | Shows executed_at timestamp |
| `src/types/delegation.ts` | Added payload field |

#### Deployment Steps
1. Apply migration: `supabase migration up` (or Supabase dashboard SQL)
2. Deploy Edge Functions:
   - `supabase functions deploy support-action`
   - `supabase functions deploy review-action`

#### Checks
- `npm run typecheck` — PASSED (zero errors)
- `npm run lint` — PASSED (zero errors)

---

### v9.6.0 — 2026-11-08 00:30 IST — Delegation Polish: History Toggle, Duplicate Guard, Legacy Key
**Author:** Claude (Opus 4.6) + Venkatesh
**Phase:** Phase 6 — Customer Portal (delegation cleanup)

#### Problems Fixed
1. **Revoked/expired grants cluttered the view** — all grants shown by default, making it hard to see active ones
2. **Duplicate active grants allowed** — could create two active grants for the same permission + same grantee
3. **`tenant.membership` raw key displayed** — old grant created with legacy key showed raw machine key instead of human label

#### Changes

**Delegation page (`delegation-page.tsx`):**
- Added `showHistory` toggle state — by default only active grants are shown
- "Show history (N)" button in header reveals revoked/expired grants; "Hide history" collapses them back
- Groups with no visible grants are hidden entirely (no empty cards)
- `hiddenCount` computed from non-active grants to drive the toggle label

**Create Grant dialog (`create-grant-dialog.tsx`):**
- Added duplicate detection: fetches existing grants via `useDelegations()` hook
- `duplicateGrant` memo checks for same `grantee_user_id` + same `permission_key` with `status === "active"`
- Warning banner shown when duplicate detected — tells user to revoke existing grant first
- Submit button disabled when duplicate exists — prevents accidental double-granting

**Permission config (`permission-config.ts`):**
- Added `"tenant.membership"` as legacy alias entry with label "Membership Management (legacy)"
- `LEGACY_KEYS` set filters legacy keys out of `PERMISSION_KEYS` — they appear in display labels but not in the Create Grant dropdown

#### Files Modified
| File | Change |
|------|--------|
| `src/platform/delegation/delegation-page.tsx` | `showHistory` toggle, filter to active-only by default |
| `src/platform/delegation/create-grant-dialog.tsx` | Duplicate active grant detection + warning banner + submit block |
| `src/lib/permission-config.ts` | Added `tenant.membership` legacy entry + `LEGACY_KEYS` filter |

#### Checks
- `npm run typecheck` — PASSED (zero errors)
- `npm run lint` — PASSED (zero errors)

---

### v9.5.0 — 2026-11-07 23:30 IST — Delegation Workflow Overhaul
**Author:** Claude (Opus 4.6) + Venkatesh
**Phase:** Phase 6 — Customer Portal (support ops workflow)

#### Problems Fixed
1. **Approve/Reject used browser `prompt()`** — unprofessional, can be blocked, no error feedback
2. **"Submit Request" was on Super Admin page** — Super Admin doesn't need to request their own approval
3. **Support Ops had no "Submit Request" button** — they could see requests but not create them from their dashboard
4. **Raw permission keys everywhere** — `tenant.config.update` instead of "Tenant Config — Update"
5. **Flat grant table** — 3 grants for same person shown as 3 identical-looking rows

#### Changes

**Super Admin `/delegation` page:**
- Grants grouped by grantee — one card per person with avatar, email, and all their permissions listed with action badges
- "Approval Queue" replaces "Action Requests" — renamed, shows pending count badge
- Approve/Reject rebuilt with inline form (reason textarea + green/red buttons + error display)
- "Submit Request" button removed — Super Admin only reviews, doesn't submit
- Human-readable permission labels everywhere via `permission-config.ts`

**Support Ops `/support/requests` page:**
- Added "Submit Request" button (only visible to support_ops role)
- Action labels show human-readable text from permission-config.ts
- Reuses the same `CreateActionRequestDialog` with smart action dropdown

**Support Ops `/support/delegations` page:**
- Permission column now shows human label + action badges instead of raw key

**Data layer:**
- `use-action-requests.ts` — query now joins `grant:support_permission_grants!grant_id(permission_key)` to get permission context for human-readable labels

#### Files Modified
| File | Change |
|------|--------|
| `src/platform/delegation/delegation-page.tsx` | Rebuilt — grouped by grantee, human labels |
| `src/platform/delegation/action-requests-section.tsx` | Rebuilt — inline review form, no prompt(), no Submit Request button |
| `src/platform/support/support-requests-page.tsx` | Added Submit Request button + human labels |
| `src/platform/support/support-delegations-page.tsx` | Human-readable permission labels + action badges |
| `src/hooks/use-action-requests.ts` | Added grant join for permission_key |

#### Checks
- `npm run typecheck` — PASSED (zero errors)
- `npm run lint` — PASSED (zero errors)

---

### v9.4.0 — 2026-11-07 23:00 IST — Smart Delegation Dialogs
**Author:** Claude (Opus 4.6) + Venkatesh
**Phase:** Phase 6 — Customer Portal (support ops UX)

#### Problem
1. **Create Grant dialog** — permission key dropdown values (`tenant.manage`, `tenant.membership`, etc.) did not match the Edge Function's expected keys (`tenant.config.update`, `tenant.membership.manage`, etc.), so grants created from the UI would never validate.
2. **Create Grant dialog** — "Allowed Actions" was a free-text comma-separated input. Users had to guess valid action strings.
3. **Submit Action Request dialog** — "Requested Action" was a free-text input with misleading placeholder. Any freeform text would fail validation against the grant's `allowed_actions` array.

#### Fix

**Central permission config** (`src/lib/permission-config.ts`)
- Single source of truth mapping each `permission_key` to human-readable label + valid action definitions
- 6 permission keys, each with typed action list

**Create Grant dialog** — rebuilt:
- Permission dropdown now uses correct Edge Function keys
- "Allowed Actions" replaced with checkboxes populated from the selected permission's action list
- "Select all" convenience button
- Submit disabled until at least one action is checked

**Submit Action Request dialog** — rebuilt:
- "Requested Action" replaced with a dropdown showing only the selected grant's `allowed_actions`
- Actions show human labels + machine values from `permission-config.ts`
- Disabled until a grant is selected; shows "Select a grant first" hint

#### Files Created
| File | Purpose |
|------|---------|
| `src/lib/permission-config.ts` | Central permission → actions mapping |

#### Files Modified
| File | Change |
|------|--------|
| `src/platform/delegation/create-grant-dialog.tsx` | Rebuilt with correct permission keys + action checkboxes |
| `src/platform/delegation/create-action-request-dialog.tsx` | Rebuilt with action dropdown from grant's allowed_actions |

#### Checks
- `npm run typecheck` — PASSED (zero errors)
- `npm run lint` — PASSED (zero errors)

---

### v9.3.1 — 2026-11-07 22:00 IST — Bug Fix: Customer Portal sidebar navigation
**Author:** Claude (Opus 4.6) + Venkatesh
**Phase:** Phase 6 — Customer Portal (bug fix)

#### Problem
Clicking any sidebar link in the Customer Portal (Appointments, My Health, Progress, Documents) redirected back to `/portal` instead of navigating to the sub-page.

#### Root Cause
Route collision: the public login route `/portal/:slug` (PortalLoginPage) in the outer `<Routes>` matched `/portal/appointments`, `/portal/health`, etc. — treating the sub-page name as the `:slug` parameter. React Router picked this over the authenticated `/portal/*` routes inside the nested `<Routes>` because the outer route was more specific at that level.

**Flow:** Click "Appointments" → `/portal/appointments` → outer Routes matches `/portal/:slug` (slug="appointments") → PortalLoginPage renders → sees user authenticated → redirects to `/portal` → back to home.

#### Fix
Changed portal login URL from `/portal/:slug` to `/join/:slug`. Eliminates collision — `/join/:slug` never conflicts with `/portal/*` routes.

#### Files Modified
| File | Change |
|------|--------|
| `src/App.tsx` | Route path `/portal/:slug` → `/join/:slug` |
| `src/platform/portal-links/portal-links-page.tsx` | Client URL `/portal/${slug}` → `/join/${slug}` |
| `src/platform/tenants/create-tenant-dialog.tsx` | Slug preview `/portal/{slug}` → `/join/{slug}` |

#### Checks
- `npm run typecheck` — PASSED (zero errors)
- `npm run lint` — PASSED (zero errors)

---

### v9.3.0 — 2026-11-07 21:00 IST — Strict Portal Route Isolation
**Author:** Claude (Opus 4.6) + Venkatesh
**Phase:** Phase 6 — Customer Portal (security)

#### Problem
Any authenticated user could navigate to any portal URL and see that portal's UI. SuperAdmin could view `/support`, support_ops could view `/portal`, customers could type `/t/:slug/dashboard`, etc. No role-to-route enforcement existed beyond `DashboardShell`.

#### Solution — 4-Layer Defence

**Layer 1: Central Portal Config** (`src/lib/portal-config.ts`)
- Single source of truth: role → allowed zones → redirect targets
- `isAllowedInZone()` — checks platform_role + tenant_role + viewMode
- `getHomeRoute()` — returns correct home for any role combo

**Layer 2: Shell Route Guards** (frontend)
| Shell | Guard | Redirect |
|-------|-------|----------|
| `DashboardShell` | `super_admin` only (v9.2.1) | role-based home |
| `SupportShell` | `support_ops` only | role-based home |
| `CustomerPortalShell` | `customer` OR super_admin in View As | role-based home |
| `TenantShell` | blocks `customer` role | `/portal` |

**Layer 3: Login Page Role Validation** (post-auth check)
| Login Page | Rule |
|-----------|------|
| `/auth/login` | Only `super_admin` + `support_ops`. Tenant users → sign out + error |
| `/portal/:slug` | Only customers. `super_admin`/`support_ops` → sign out + error |
| `/login/:slug` | Only staff/admin/practitioner. `customer` → sign out + error |

**Layer 4: Audit Logging** (`src/lib/log-portal-block.ts`)
- Every blocked cross-portal navigation logged to `audit_logs`
- Action: `portal.access_blocked`, details include attempted route + user role

**Layer 5: Backend RLS** (already existed)
- RLS policies on every table enforce data isolation regardless of frontend route

#### Files Created
| File | Purpose |
|------|---------|
| `src/lib/portal-config.ts` | Central portal config — roles, zones, redirects |
| `src/lib/log-portal-block.ts` | Audit logger for blocked cross-portal attempts |

#### Files Modified
| File | Change |
|------|--------|
| `src/components/support-shell.tsx` | Added role guard — only `support_ops` |
| `src/components/customer-portal-shell.tsx` | Added role guard — only `customer` or super_admin View As |
| `src/components/tenant-shell.tsx` | Added customer → `/portal` redirect |
| `src/platform/auth/login-page.tsx` | Post-auth role check — blocks non-admin roles |
| `src/portal/portal-login.tsx` | Post-auth role check — blocks admin/support roles |
| `src/platform/auth/staff-login-page.tsx` | Post-auth role check — blocks customer role |

#### Checks
- `npm run typecheck` — PASSED (zero errors)
- `npm run lint` — PASSED (zero errors)

---

### v9.2.1 — 2026-11-07 20:00 IST — Bug Fix: support_ops access to platform admin routes
**Author:** Claude (Opus 4.6) + Venkatesh
**Phase:** Phase 6 — Customer Portal (security fix)

#### Bug
L1_Support (`support_ops` role) could navigate to `/delegation`, `/tenants`, `/audit` etc. and see the full Super Admin platform dashboard with all nav items. The `DashboardShell` role guard allowed both `super_admin` AND `support_ops` through (line 49: `platformRole !== "super_admin" && platformRole !== "support_ops"`).

#### Root Cause
`DashboardShell` was the layout for platform admin routes (`/`, `/tenants`, `/delegation`, etc.). Its guard treated `support_ops` the same as `super_admin` — both passed through to the platform sidebar + content. A `support_ops` user should ONLY access `/support/*` routes via `SupportShell`.

#### Fix
Added an early redirect in `DashboardShell`: if `platformRole === "support_ops"`, immediately `<Navigate to="/support" replace />`. Now `support_ops` users are blocked from all platform admin routes and sent to their own shell.

#### File Modified
| File | Change |
|------|--------|
| `src/components/dashboard-shell.tsx` | Added `support_ops` → `/support` redirect before the `super_admin` check |

#### Checks
- `npm run typecheck` — PASSED
- `npm run lint` — PASSED

---

### v9.2.0 — 2026-11-07 19:30 IST — Password Visibility Toggle
**Author:** Claude (Opus 4.6) + Venkatesh
**Phase:** Phase 6 — Customer Portal (cross-cutting)

#### Changes
- **Eye/EyeOff toggle** on every password field across the project
- Clicking the eye icon switches `type="password"` ↔ `type="text"`
- Uses `lucide-react` `Eye` and `EyeOff` icons
- Positioned inside the input with `absolute inset-y-0 right-0 pr-3`
- Input gets `pr-10` to avoid text overlapping the icon

#### Files Modified
| File | Password fields |
|------|----------------|
| `src/platform/auth/login-page.tsx` | 1 (sign in + sign up shared) |
| `src/portal/portal-login.tsx` | 1 (member portal sign in + sign up) |
| `src/platform/auth/staff-login-page.tsx` | 1 (staff sign in) |
| `src/platform/auth/reset-password-page.tsx` | 2 (new password + confirm — independent toggles) |

#### Checks
- `npm run typecheck` — PASSED (zero errors)
- `npm run lint` — PASSED (zero errors)

---

### v9.1.0 — 2026-11-07 18:30 IST — Smart Collapsible Sidebar
**Author:** Claude (Opus 4.6) + Venkatesh
**Phase:** Phase 6 — Customer Portal (cross-cutting)

#### Changes
- **Smart sidebar** — collapsible sidebar with two modes:
  - **Expanded** (w-64 / 256px): Full icons + labels, user avatar with initials + name + role, chevron-left toggle
  - **Collapsed** (w-[72px]): Icons only, avatar circle only, floating tooltip on hover, chevron-right toggle
- **User avatar** — circular initials badge at sidebar top (profile section like reference design)
- **Collapse state persisted** in `localStorage` (key: `uniklife-sidebar-collapsed`) — survives page refresh
- **Mobile unchanged** — on < lg screens: always full-width overlay mode, hamburger + backdrop (from v9.0.0)
- **Smooth animation** — `transition-all duration-200` on sidebar width change
- **Tooltips** — in collapsed mode, each nav item shows a floating tooltip label on hover via CSS group-hover

#### Files Modified
| File | Change |
|------|--------|
| `src/components/dashboard-shell.tsx` | ShellLayout rewritten with collapsed state, avatar, tooltips, toggle |
| `src/components/support-shell.tsx` | Same smart sidebar pattern (independent component) |
| `src/lib/nav-config.ts` | NavItem interface extended with optional `children` (future nav groups) |

#### Shells That Benefit
- `DashboardShell` (Platform Admin) — direct
- `TenantShell` — uses ShellLayout, gets it for free
- `CustomerPortalShell` — uses ShellLayout, gets it for free
- `SupportShell` — independent, updated separately

#### Checks
- `npm run typecheck` — PASSED (zero errors)
- `npm run lint` — PASSED (zero errors)

---

### v9.0.0 — 2026-11-07 17:00 IST — Full Responsive Overhaul
**Author:** Claude (Opus 4.6) + Venkatesh
**Phase:** Phase 6 — Customer Portal (cross-cutting)

#### Problem
1. Sidebar width flickered/jumped when navigating between Dashboard, Tenants, Portal Links — flex layout allowed sidebar to shrink when page content was wide.
2. Entire platform had no mobile/responsive support — sidebar always visible at 256px, tables overflowed, dialogs touched screen edges, no way to collapse nav on small screens.

#### Changes — Shell Layouts
- **`ShellLayout` (dashboard-shell.tsx) fully rewritten** — responsive sidebar: hidden on mobile (`< lg`), always visible on desktop (`>= lg`). Mobile: hamburger icon in sticky top bar opens sidebar as fixed overlay with backdrop. Sidebar closes on nav item click. Added `shrink-0` to prevent flex shrink (fixes the width jumping bug). Added `min-w-0` on main content wrapper to prevent flex overflow.
- **`SupportShell` (support-shell.tsx) fully rewritten** — same responsive pattern: fixed overlay sidebar on mobile, static on desktop, hamburger menu, auto-close on nav click.

#### Changes — Table Containers (21 files)
- Changed `overflow-hidden` → `overflow-x-auto` on every table wrapper across platform, tenant, and portal pages. Tables now scroll horizontally on narrow screens instead of overflowing or being clipped.
- Files: member-list, entitlement-list, tenants-page, delegation-page, action-requests-section, priv-log-section, support-delegations-page, users-page, support-home, support-requests-page, audit-page, client-detail-page (2x), billing-page, clients-page, documents-page, reports-page, appointments-page, tenant-dashboard, progress-reviews-page (2x), staff-page.

#### Changes — Page Padding (30 files)
- Changed `p-6` → `p-4 sm:p-6` on all page top-level containers (platform, tenant, portal, support). 16px on mobile, 24px on sm+.

#### Changes — Dialog Containers (15 files)
- Added `p-4` to all dialog backdrop containers so dialogs don't touch screen edges on mobile. Both `onClick` and non-`onClick` variants updated.

#### Changes — Page Headers
- Added `flex-wrap gap-3` to main page headers with title + action button (tenants, delegation, users, clients). Button wraps below title on narrow screens.

#### Typecheck & Lint
- `npm run typecheck` — PASSED (zero errors)
- `npm run lint` — PASSED (zero errors)

---

### v8.9.0 — 2026-11-07 15:30 IST — Support Team Roster + Delegation UX Upgrade
**Author:** Claude (Opus 4.6) + Venkatesh
**Phase:** Phase 6 — Customer Portal (platform infra)

#### Changes
- **New migration `20261116_001_support_team_members.sql`** — `support_team_members` table with RLS (super_admin full CRUD, support_ops read). Columns: `user_id`, `added_by`, `label`, `status`, `notes`. UNIQUE on `user_id`.
- **New type `SupportTeamMember`** in `src/types/delegation.ts` — includes `SupportTeamStatus` union.
- **New hook `src/hooks/use-support-team.ts`** — `useSupportTeam()`, `useActiveSupportMembers()`, `useAddSupportMember()`, `useUpdateSupportMember()`. Add member does email lookup + prevents adding super_admin. Upsert on `user_id` to handle re-adding removed members.
- **Users page (`/users`) fully rebuilt** — was a "Coming soon" placeholder. Now shows support team roster with search, status badges, active grant count per member, activate/deactivate/remove actions, and "Add Member" dialog.
- **Create Grant dialog upgraded** — replaced raw email input with a dropdown of active support team members from `useActiveSupportMembers()`. Shows helpful message if no active members exist.
- **Nav label** changed from "Users" to "Support Team" in `nav-config.ts`.

#### Role Promotion & Access Guard Fix (v8.9.1)
- **New migration `20261118_001_super_admin_update_users.sql`** — adds `users_update_super` policy so super admin can update any platform_users row (required for role promotion).
- **`useAddSupportMember`** now promotes user to `platform_role = 'support_ops'` after adding to roster. This means when a support member logs in, they see the `/support` shell — not "Account not linked".
- **`useUpdateSupportMember`** now syncs `platform_role`: deactivate/remove → reverts to `tenant_user`; reactivate → restores `support_ops`.
- **`DashboardShell` now guards access** — only `super_admin` and `support_ops` see the platform sidebar. Non-admin users are redirected to their correct experience (portal, tenant dashboard). Unlinked users see a standalone "Account not linked" page without the admin sidebar + a Sign Out button.

#### Auth Route Fix
- Added `/auth/login` and `/auth/signup` as **public routes** (outside AuthGate) so they work regardless of login state.
- `LoginPage` now accepts `initialMode` prop — `/auth/signup` opens directly on the signup tab.
- **Add Member dialog** now shows a copyable signup link (`/auth/signup`) at the top, so super admin can share it with new team members who don't have an account yet.
- When a user is not found, the error message guides the admin to share the signup link instead of a generic failure.

#### Login Redirect Bug Fix (v8.9.2)
- **Root cause:** `LoginPage` was designed to render inside `AuthGate`. In that context, after `signInWithPassword` succeeds, `onAuthStateChange` fires, the auth store updates, and AuthGate re-renders showing app routes — no redirect needed. When `/auth/login` and `/auth/signup` were added as public routes outside AuthGate, the LoginPage had no redirect logic after successful login. The component stayed at `/auth/login` indefinitely.
- **Fix in `src/platform/auth/login-page.tsx`:** Added `useNavigate` + `useLocation`. After successful login on public routes (`location.pathname.startsWith("/auth/")`), calls `navigate("/", { replace: true })`. This sends the user to the root, where AuthGate picks up the authenticated session and `RoleRedirect` routes to the correct shell.
- **Secondary issue:** Supabase GoTrue requires bcrypt cost factor 10 (`$2a$10$`). Default `gen_salt('bf')` produces cost factor 6 — corrected SQL provided with `gen_salt('bf', 10)`.

#### Two-Tier Model
1. **Roster** — Super Admin adds people to support team on `/users` page
2. **Grants** — Super Admin creates time-limited delegation grants on `/delegation` page, selecting from the roster dropdown

#### Typecheck & Lint
- `npm run typecheck` — PASSED (zero errors)
- `npm run lint` — PASSED (zero errors)

---

### v8.8.0 — 2026-11-07 09:00 IST — Port stability + role redirect timing fix
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Phase 6 — Customer Portal (bug fixes)

#### Problem
Two bugs reported:
1. Every `npm run dev` restart could pick a new port (5173→5174→…) because Vite has no fixed port configured. URLs shared from Portal Links page would stop working after a server restart.
2. After login via `/login/:slug`, all roles (admin, practitioner, staff) were landing on the tenant dashboard instead of their role-specific home page.

#### Root causes
- **Port drift**: `vite.config.ts` had no `server` block; Vite increments port if the previous one is still being released by the OS.
- **Redirect timing**: After `signInWithPassword()` succeeds, Supabase fires `SIGNED_IN` → `setUser()` runs first (sets `isAuthenticated=true`) → the redirect `useEffect` fires immediately with `activeRole=null` (memberships not loaded yet) → everyone fell through to the final `else` branch → `/t/${slug}/dashboard`. A few ms later `setActiveTenant()` fired with the real role and re-navigated, but the first incorrect navigate already happened (visible as a flash and potential race condition).

#### Changes
- **`vite.config.ts`**: Added `server: { port: 5173, strictPort: false }`. Vite now always tries 5173 first; falls back gracefully if the port is genuinely occupied. Portal Links already uses `window.location.origin` so URLs are always current regardless of actual port.
- **`src/platform/auth/staff-login-page.tsx`**: Added `if (activeRole === null) return;` guard after the super_admin/support_ops checks. For tenant users, this prevents the premature redirect before `setActiveTenant()` populates the real role. The effect re-fires once `activeRole` is set, landing each role on the correct page:
  - `tenant_admin` → `/t/:slug/dashboard`
  - `practitioner` → `/t/:slug/workspace`
  - `staff` → `/t/:slug/clients`
  - `customer` → `/portal`

#### Verification
- `npm run typecheck` — PASSED (zero errors)
- `npm run lint` — PASSED (zero errors)
- No new files, no migrations, no DB changes.

---

### v8.7.0 — 2026-11-07 04:00 IST — Portal Links page in Super Admin sidebar
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Platform — Super Admin tooling

#### What Was Built
Super Admin now has a "Portal Links" page (sidebar nav item) that shows every entry point in the system — no more memorising URLs.

**Platform section (fixed):**
- Super Admin → `/`
- Support Ops → `/auth/login`
- Platform Admin → "Coming soon" placeholder

**Tenant Portals section (dynamic — one card per tenant):**
Each card shows:
- Tenant name, slug, status badge
- **Team Login** (`/login/[slug]`) — shared by Admin, Practitioner, Staff; role auto-detected after sign in; role badges shown
- **Client Portal** (`/portal/[slug]`) — patient/member signup + login

Each URL has:
- **Copy** button (clipboard, shows ✓ for 2s)
- **Open** button (opens in new tab)

Active tenants appear first, inactive tenants dimmed below.
Uses `window.location.origin` so the URLs are correct in both dev (`localhost:5173`) and production (`app.uniklife.ai`).

#### New Files
- `src/platform/portal-links/portal-links-page.tsx`

#### Updated Files
- `src/lib/nav-config.ts` — added "Portal Links" with Link2 icon between Tenants and Users
- `src/app.tsx` — added `/portal-links` route inside platform DashboardShell

#### Typecheck & Lint
- `npm run typecheck` — PASSED
- `npm run lint` — PASSED

---

### v8.6.0 — 2026-11-07 03:00 IST — Branded staff login page at /login/:slug
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Platform — Multi-tenant white-label URLs

#### What Was Built
Every tenant now has two branded entry points — one for staff, one for clients:

```
/login/:slug    →  Staff / Admin / Practitioner login (Team Portal)
/portal/:slug   →  Customer / Client login (Member Portal)
```

Both pages load the tenant's logo, name, and accent color via `get_portal_config()` RPC. The client only ever sees their clinic's brand — UNIKLIFE.AI appears only as a small "Powered by" footnote.

**Post-login redirect is role-aware:**
- `super_admin` → `/`
- `support_ops` → `/support`
- `customer` → `/portal`
- `tenant_admin` → `/t/${slug}/dashboard`
- `practitioner` → `/t/${slug}/workspace`
- `staff` → `/t/${slug}/clients`

Staff login has no Sign Up tab (staff are added by admins, not self-service). Has Sign In + Forgot Password only.

**Example shareable URLs for a "Healthy Fitness" tenant:**
- Staff team bookmark: `app.uniklife.ai/login/healthy-fitness`
- Client signup link: `app.uniklife.ai/portal/healthy-fitness`

Scales to unlimited tenants — no code change needed per new tenant.

#### New Files
- `src/platform/auth/staff-login-page.tsx`

#### Updated Files
- `src/app.tsx` — added `<Route path="/login/:slug" element={<StaffLoginPage />} />` in public section

#### Typecheck & Lint
- `npm run typecheck` — PASSED
- `npm run lint` — PASSED

---

### v8.5.0 — 2026-11-07 02:00 IST — Smart module activation: tier bundles + auto-resolve dependencies
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Platform — Module Management UX

#### What Was Built
Eliminated all module activation confusion. Three problems solved at once:

**Problem 1 — New tenant setup was manual:** Admin had to assign and activate modules one by one in dependency order, getting "Cannot activate: missing required dependencies" errors with no guidance.
**Fix:** Create Tenant dialog now has a visual 4-tier picker (Starter/Standard/Professional/Enterprise). After clicking "Create & Activate", all modules for that tier are auto-assigned and activated in correct topological order. Admin sees a progress spinner then a "X is ready — N modules activated" confirmation.

**Problem 2 — Individual activation hit dead ends:** Clicking Activate on W03 showed "Cannot activate" with no path forward.
**Fix:** Activate button now checks deps client-side first. If deps are missing, shows a modal: "To activate Health Assessment, we also need: 1. Wellness Core (W01). Activate All?" — one confirm click activates the full chain.

**Problem 3 — Module table was cryptic:** Codes like W03/W04, raw status names like "pending", no descriptions.
**Fix:** EntitlementList rewritten with: full module name as primary text, description as subtitle, human-readable status pills with icons (Active ✓, Paused ⏸, Disabled ✗), layer labels with module code secondary.

**Bonus — Quick Setup bar:** Existing tenants get a "Quick setup" bar at the top of the Modules tab — pick a tier, click "Activate Bundle" — same batch activation as tenant creation.

#### New Files
- `src/lib/module-tiers.ts` — tier definitions (4 tiers × module lists), `resolveActivationOrder()` (topological sort), `missingDependencies()`, `TierKey` type

#### Updated Files
- `src/hooks/use-entitlements.ts` — `useBatchActivateModules()` hook (assign-then-activate in order)
- `src/platform/tenants/create-tenant-dialog.tsx` — visual tier picker, "Create & Activate" flow, spinner + done confirmation
- `src/platform/tenants/entitlement-list.tsx` — full rewrite: human names, status pills with icons, smart Activate-with-deps modal, Quick Setup bundle bar, module dropdown grouped by layer

#### Typecheck & Lint
- `npm run typecheck` — PASSED
- `npm run lint` — PASSED

---

### v8.4.0 — 2026-11-07 01:00 IST — Tenant-branded portal login page
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Phase 6 — Customer Portal (6.10)

#### What Was Built
Customers now have a shareable, tenant-branded entry point to sign up and log in to their wellness portal.

**URL:** `/portal/:slug` — e.g. `localhost:5173/portal/healthy-fitness`

The page:
- Loads tenant display config (name, logo, accent color) via a new public RPC `get_portal_config()` — works for unauthenticated users (no login required to see branding)
- Shows tenant logo (if set) or a colored avatar initial as fallback
- Accent color driven by `sidebar_gradient_from` from tenant branding (falls back to royal-blue)
- Sign In / Sign Up / Forgot Password modes — same logic as internal `/auth/login`
- After successful sign in → redirects to `/portal` (auto-link RPC fires, portal loads with real data)
- If already authenticated → immediately redirects to `/portal`
- If tenant is inactive → shows "Portal unavailable" message
- If RPC fails (tenant not found) → humanizes slug as name fallback
- "Powered by UNIKLIFE.AI" footer (sub-brand, non-obtrusive)

**Shareable URL for practitioners to send to clients:**
`https://[your-domain]/portal/healthy-fitness`

#### Migration
- `20261115_001_portal_config_rpc.sql` — `get_portal_config(p_slug TEXT)` SECURITY DEFINER function. Joins `tenants` + `tenant_branding`, returns name/logo/colors/is_active. Grants EXECUTE to `anon` and `authenticated`.

#### New Files
- `src/portal/portal-login.tsx` — tenant-branded portal login/signup page
- `supabase/migrations/20261115_001_portal_config_rpc.sql`

#### Updated Files
- `src/app.tsx` — added `<Route path="/portal/:slug" element={<PortalLoginPage />} />` in public section (outside AuthGate)

#### To Apply
Run: `npx supabase db push`

#### Typecheck & Lint
- `npm run typecheck` — PASSED
- `npm run lint` — PASSED

---

### v8.3.0 — 2026-11-07 00:30 IST — Bug fix: View As exit destination + role nav routing
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Platform — Super Admin tooling (bug fix)

#### What Was Fixed

**Bug 1 — Exit view mode redirect:**
Clicking "Exit View Mode" in the amber banner was always navigating to `/` (super admin dashboard) regardless of where the super admin was before entering view mode. Now it correctly returns to the originating page (e.g., `/tenants`, `/t/slug/clients`).

**Root cause:** `view-mode-banner.tsx` hardcoded `navigate("/", { replace: true })`. No return path was saved.

**Fix:** `ViewMode` interface gained a `returnPath?: string` field. `enterViewMode()` now accepts and stores it. Both call sites (`tenants-page.tsx` and `clients-page.tsx`) pass `window.location.pathname` as `returnPath`. `handleExit()` in the banner navigates to `viewMode?.returnPath ?? "/"`.

**Bug 2 — All roles landing on admin dashboard:**
Clicking Admin / Practitioner / Staff / Customer from the eye icon dropdown all navigated to `/t/${slug}/dashboard`, which is the admin stats dashboard — so all roles showed the same admin page content.

**Root cause:** `handleViewAs` in `tenants-page.tsx` always called `navigate(\`/t/${slug}/dashboard\`)` for all non-customer roles. The sidebar nav was correct (Zustand `activeRole` was set properly via `enterViewMode`), but the initial page content was always the admin dashboard.

**Fix:** Navigate to each role's natural home page:
- `tenant_admin` → `/t/${slug}/dashboard` (admin stats)
- `practitioner` → `/t/${slug}/workspace` (daily schedule / client queue)
- `staff` → `/t/${slug}/clients` (client list)
- `customer` → `/portal`

#### Updated Files
- `src/hooks/use-auth.ts` — `ViewMode.returnPath?: string` field; `enterViewMode` destructures + stores it
- `src/components/view-mode-banner.tsx` — `handleExit` reads `viewMode?.returnPath ?? "/"` before navigating
- `src/platform/tenants/tenants-page.tsx` — `handleViewAs` passes `returnPath: window.location.pathname`; role-specific navigate destination
- `src/tenant/clients-page.tsx` — `handleViewAsCustomer` passes `returnPath: window.location.pathname`

#### Typecheck & Lint
- `npm run typecheck` — PASSED
- `npm run lint` — PASSED

---

### v8.2.0 — 2026-11-06 23:30 IST — View As mode for Super Admin
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Platform — Super Admin tooling

#### What Was Built
Super Admin can now "view as" any role across any tenant without logging in as that user. Clicking the eye icon on the Tenants page opens a role picker. Clicking the eye icon next to a client on the Clients page opens their customer portal view with real data.

#### Flow
1. Super Admin → Tenants list → eye icon → role picker dropdown → click role
   - Admin / Practitioner / Staff → navigates to `/t/{slug}/dashboard` with that role's sidebar + pages
   - Customer Portal → navigates to `/portal` (generic portal view, no specific client data)
2. Super Admin (in Admin view mode) → Clients list → eye icon per client → navigates to `/portal` showing that specific customer's real data (measurements, appointments, care plan, documents)
3. Amber banner persists at the top: "👁 Viewing as [Tenant Name] · [Role Badge] · Exit View Mode"
4. Clicking Exit → returns to Super Admin dashboard, restores original context

#### Technical approach
- No actual impersonation — super admin stays authenticated as themselves
- `viewMode` state added to Zustand auth store: `{ tenantId, slug, tenantName, role, contactId? }`
- `enterViewMode()` saves original `activeTenantId/Slug/Role` as `_savedContext`, then directly sets them to viewed values
- `exitViewMode()` restores from `_savedContext`
- All existing tenant pages (use `activeTenantId` from store) work unchanged — they see the viewed tenant's data because super_admin RLS bypasses tenant isolation
- Portal pages check `viewMode.contactId` to override the `auth_user_id` lookup with a direct contact ID match

#### New Files
- `src/components/view-mode-banner.tsx` — sticky amber banner with role badge + exit button

#### Updated Files
- `src/hooks/use-auth.ts` — `ViewMode` interface, `viewMode`, `_savedContext` state, `enterViewMode()`, `exitViewMode()` actions
- `src/platform/tenants/tenants-page.tsx` — `RolePicker` dropdown component, eye icon per row, `handleViewAs()`
- `src/tenant/clients-page.tsx` — eye icon per client row (super_admin only), calls `enterViewMode` with `contactId`
- `src/app.tsx` — `ViewModeBanner` rendered inside `AuthGate` above all routes
- `src/portal/portal-home.tsx` — `viewMode.contactId` override for client lookup
- `src/portal/portal-progress.tsx` — same
- `src/portal/portal-appointments.tsx` — same (overrides contact lookup)
- `src/portal/portal-health.tsx` — same
- `src/portal/portal-documents.tsx` — same (overrides contact Supabase query)

#### Typecheck & Lint
- `npm run typecheck` — PASSED
- `npm run lint` — PASSED

---

### v8.1.0 — 2026-11-06 22:30 IST — Phase 6: Customer account self-linking
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Phase 6 — Customer Portal (6.8)

#### What Was Built

Customers can now sign up at the existing `/auth/login` page (Sign up tab) and be automatically linked to their contact record and tenant membership on first login. No manual admin step required after the practitioner has registered the customer's email in CRM.

#### Flow
1. Practitioner creates contact in CRM → webhook syncs to `contacts` table with the customer's email
2. Customer goes to the UNIKLIFE app, clicks "Sign up", enters email + password + name
3. Customer confirms email (Supabase sends verification email)
4. Customer signs in → `handle_new_user()` trigger creates `platform_users` row
5. `useAuthListener` detects no memberships + `platform_role = 'tenant_user'`
6. Calls `link_customer_account()` RPC automatically
7. RPC finds `contacts` row by email, sets `auth_user_id`, creates `tenant_memberships(role='customer')`
8. Memberships reload → `RoleRedirect` → `/portal`

#### If No Contact Found
Customer sees a friendly "Account not linked" screen showing their email and instructions to contact their practitioner.

#### New Files
- `supabase/migrations/20261114_001_link_customer_account.sql` — `link_customer_account()` SECURITY DEFINER RPC

#### Updated Files
- `src/hooks/use-auth.ts` — auto-link logic in `useAuthListener` (both initial load + SIGNED_IN event); runs only for `tenant_user` platform role with 0 memberships
- `src/app.tsx` — `RoleRedirect` now shows email + friendly message when no contact found

#### Security Notes
- RPC is `SECURITY DEFINER` — bypasses RLS intentionally to find contact by email
- Contact match requires `email = auth.email()` — Supabase guarantees the user owns the verified email
- Only unlinked contacts (`auth_user_id IS NULL`) or already linked to this user are matched — prevents hijacking
- `GRANT EXECUTE ... TO authenticated` — only authenticated users can call it

#### Typecheck & Lint
- `npm run typecheck` — PASSED
- `npm run lint` — PASSED

---

### v8.0.0 — 2026-11-06 21:30 IST — Phase 6: Customer Portal
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Phase 6 — Customer Portal

#### Pages Built

| Page | Route | What It Shows |
|------|-------|---------------|
| Home | `/portal` | Vitals summary, active programs, upcoming appointments (from crm_appointments), daily check-in widget |
| Progress | `/portal/progress` | Weight/BMI/body fat cards with trend indicators, vitals section, full measurement history table |
| Appointments | `/portal/appointments` | Upcoming + past appointments from crm_appointments mirror, status badges, staff name |
| My Health | `/portal/health` | Health assessment (conditions, allergies, medical history), care plan with goal progress bars, meal plan summary |
| Documents | `/portal/documents` | CRM documents fetched via CRM adapter, file name, type, size, download link |

#### New Files
- `src/portal/portal-progress.tsx`
- `src/portal/portal-appointments.tsx`
- `src/portal/portal-health.tsx`
- `src/portal/portal-documents.tsx`

#### Updated Files
- `src/portal/portal-home.tsx` — added daily check-in widget (`check_ins` table), switched upcoming appointments to `crm_appointments` mirror (filtered by `contact_id`)
- `src/app.tsx` — wired all 4 placeholder routes to real pages
- `src/types/wellness.ts` — added `crm_contact_id` and `crm_location_id` to `Contact` interface
- `index.html` — PWA meta tags + manifest link
- `public/manifest.json` — new PWA manifest (standalone display, theme #1e3a8a, start_url /portal)

#### Architecture Notes
- Portal appointments read from `crm_appointments` Supabase mirror (not CRM API) — filtered by `contact_id = myClient.contact_id`
- Portal documents use CRM adapter (`getCrmDocuments`) with `crm_contact_id` from contacts table
- Daily check-in: creates/updates `check_ins` row for today; shows completion state if already done
- No new migrations needed — all tables already exist

#### Typecheck & Lint
- `npm run typecheck` — PASSED (zero errors)
- `npm run lint` — PASSED (zero errors)

---

### v7.7.0 — 2026-11-06 20:00 IST — Bug fix: integer field validation in Log Measurements form
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Phase 10 — Wellness Operations bug fix

#### Problem
Entering a decimal value (e.g. `1.3`) in the Resting HR field caused a PostgreSQL error:
> `invalid input syntax for type integer: "1.3"`

The DB columns `blood_pressure_systolic`, `blood_pressure_diastolic`, and `resting_heart_rate` are `INT` (whole numbers only). The form used `step="0.1"` for all fields uniformly, allowing decimal input that reached the DB and failed.

#### Fix
- **`src/tenant/client-detail-page.tsx`** — Added `integer: true/false` flag to each field definition in `ProgressTab`. Integer fields (BP Systolic, BP Diastolic, Resting HR) now render with `step="1"`, preventing decimal input at the UI level. The `handleLog` submit function already wraps them in `Math.round()` as a backend safety net.
- Both layers of protection: UI (`step="1"`) + server-side (`Math.round()`).

#### Typecheck & Lint
- `npm run typecheck` — PASSED (zero errors)
- `npm run lint` — PASSED (zero errors)

---

### v7.6.0 — 2026-11-06 19:00 IST — Client profile: status management + Invoices tab
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Phase 10 — CRM Integration / Wellness Operations

**Changes:**
- `src/hooks/use-wellness-clients.ts` — added `useUpdateWellnessStatus()` mutation: updates `enrollment_status` on `wellness_clients` by id; invalidates `wellness-profile` and `wellness-clients` queries on success
- `src/tenant/client-detail-page.tsx` — status badge in header replaced with badge + action buttons (Suspend / Deactivate / Reactivate) driven by current `enrollment_status`; added `invoices` as 8th tab; added `ContactCrmInvoices` component querying `crm_invoices` by `contact_id` with total amount display
- `supabase/migrations/20261113_001_wellness_status_values.sql` — extended `enrollment_status` CHECK constraint to include `suspended` and `deactivated` (was: `registered, active, inactive, discharged`)

**Status flow:**
- Active/Registered → Suspend → Suspended
- Active/Registered → Deactivate → Deactivated
- Suspended → Reactivate → Active
- Suspended → Deactivate → Deactivated
- Deactivated → Reactivate → Active

**Data is never deleted on deactivate — preserved in DB.**

**Tests:** `npm run typecheck` ✅ `npm run lint` ✅ Buttons verified working ✅

---

### v7.5.0 — 2026-11-06 18:00 IST — CRM tag strict/safe mode toggle
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Phase 10 — CRM Integration

**Problem:**
MyAppz CRM has a bug: tag changes on the contact detail page do not persist to the backend (contact list still shows old tag). This means the CRM never fires a `contact.updated` webhook with correct tag data, so strict mode (no tags = skip) blocks all new contact syncs.

**Fix:**
- `supabase/migrations/20261112_001_crm_tag_strict_mode.sql` — adds `crm_tag_strict_mode BOOLEAN DEFAULT false` to `tenants`
- `supabase/functions/crm-webhook/index.ts` — reads `crm_tag_strict_mode` from tenant; strict=true: no tags = skip; strict=false (default): no tags = sync anyway (safe fallback)
- `src/types/tenant.ts` — added `crm_location_id`, `crm_contact_tag`, `crm_tag_strict_mode` to `Tenant` interface
- `src/hooks/use-tenants.ts` — added `crm_contact_tag` and `crm_tag_strict_mode` to `UpdateTenantInput`
- `src/tenant/tenant-settings-page.tsx` — added `CrmSettingsSection` with toggle UI; shows current tag, mode badge, toggle button

**CRM bug documented in:** `PENDING_CODE_CHANGES.md` entry [OPEN] CRM Tag Removal

**Current state:** Toggle OFF (safe mode) — contacts sync even when CRM sends empty tags payload. Flip ON after CRM fixes their webhook bug.

**Tests:** `npm run typecheck` ✅ `npm run lint` ✅ Toggle verified working ✅

---

### v7.4.0 — 2026-11-06 17:00 IST — SOP documentation + PENDING_CODE_CHANGES
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Documentation

**Changes:**
- Created `docs/sop/` — 30 files across 7 sections: Platform, CRM Sync, Wellness, Operations, Admin, Workflows, Troubleshooting
  - `README.md` — index with quick links
  - `00-glossary.md` — key terms, common confusion (Contact vs Wellness Client, Tenant vs Branch, MyAppz vs UNIKLIFE CRM)
  - `01-platform/` — auth-and-login, tenants-and-branches, users-and-roles, support-delegation
  - `02-crm-sync/` — overview, contact-tag-filter (includes known CRM bug + workaround), data-links
  - `03-wellness/` — clients, health-assessments, care-plans, nutrition, programs, progress-reviews
  - `04-operations/` — appointments, billing, staff-management, reports, practitioner-workspace, documents
  - `05-admin/` — module-entitlements, branding, audit-logs
  - `06-workflows/` — onboard-new-client, book-appointment, raise-invoice
  - `07-troubleshooting/` — contact-not-appearing, appointment-missing, login-issues
- Created `PENDING_CODE_CHANGES.md` at project root — tracks 3 open items: CRM tag removal handler, appointment retroactive linking, Stage 3 CRM swap
- Updated memory: `known_issues.md` added, `MEMORY.md` index updated

---

### v7.3.0 — 2026-11-06 15:00 IST — CRM contact tag filter
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Phase 10 — CRM Integration

**Problem:**
MyAppz sub-account contains mixed contacts — wellness leads, BOSS event attendees, professional contacts. All were syncing to UNIKLIFE clients page indiscriminately.

**Context:**
- MyAppz = CRM vendor (subscribed, not owned)
- UNIKLIFE sub-account = used for UNIKLIFE's own operations/testing
- BOSS = calendar event name inside the sub-account (not a separate account)
- Healthy Lifestyle tenant maps to this sub-account via crm_location_id

**Fix:**
- `supabase/migrations/20261111_001_tenant_crm_tag.sql` — adds `crm_contact_tag TEXT` to `tenants`; sets `test_healthy-fitness` for healthy-lifestyle tenant
- `supabase/functions/crm-webhook/index.ts` — after resolving tenant, reads `crm_contact_tag`; if set, checks `payload.tags` array; skips contact if tag not present; syncs if tags absent from payload (safe fallback)
- Tag created in MyAppz: `test_healthy-fitness`

**Deployed:** Migration ✅ · crm-webhook function ✅

**Behavior going forward:**
- Contact tagged `test_healthy-fitness` → syncs to UNIKLIFE ✅
- Contact without tag → skipped, never appears ✅
- Contact with no tags field in payload → syncs (can't determine, safe fallback)
- Existing contacts → untouched (left as-is per owner decision)

**Tests:** `npm run typecheck` ✅ `npm run lint` ✅

---

### v7.2.0 — 2026-11-06 14:00 IST — Client Detail Page: CRM contact + Wellness Profile split
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Phase 10 — CRM Integration

**Problem:**
Clicking any CRM-synced contact on the Clients page showed "Client not found." because the detail page required a `wellness_clients` row, which CRM contacts don't have automatically.

**Root Cause:**
CRM contacts sync to `contacts` table only. `wellness_clients` is a separate health-profile layer that must be explicitly created by a practitioner. The old page used `useWellnessClient()` as the primary source — if no wellness row existed, the page had no data to show.

**Architecture Decision:**
- `contacts` = primary source (always exists for any CRM contact)
- `wellness_clients` = optional health layer, linked via `contact_id`
- Not every CRM contact needs a wellness profile — only those actively in a wellness program

**Fix Applied — `src/tenant/client-detail-page.tsx` (rewritten):**
- Removed `useWellnessClient` as the primary query
- Added `useContact(contactId)` — loads from `contacts` table directly (always works)
- Added `useWellnessProfile(contactId)` — loads `wellness_clients` by `contact_id` (optional)
- **Without wellness profile**: shows contact header + "Activate Wellness Profile" card + CRM appointments list
- **With wellness profile**: shows full 7-tab view (Overview, Assessments, Progress, Care Plans, Programs, Appointments, Nutrition)
- "Activate" button calls `useCreateWellnessClient` → inserts `wellness_clients` row → page transitions to full view
- `ContactCrmAppointments` component: reads `crm_appointments` by `contact_id` (replaces old `useAppointments` on old `appointments` table)
- Wellness tabs now receive `profile.id` (wellness_clients.id), not the contact UUID

**Tests:** `npm run typecheck` ✅ `npm run lint` ✅

---

### v7.1.0 — 2026-11-06 13:00 IST — Phase 5 UI Polish (CRM data gap fixes)
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Phase 10 — Step 2 close-out

**Problem:**
After CRM webhook migration, three pages were showing stale/empty data because they still read from old Supabase tables (`appointments`, `invoices`) instead of the new CRM mirror tables.

**Fixes applied:**

1. **`src/tenant/tenant-dashboard.tsx`** — "Today's Appointments" was always empty (read from old `appointments` table). Replaced `useAppointments` with inline `useTodayAppointments` querying `crm_appointments` for today's date range. Client name resolved via `contacts(first_name, last_name)` join with `Array.isArray()` guard.

2. **`src/tenant/reports-page.tsx`** — Revenue stats (Total Invoiced, Collected, Outstanding) read from old `invoices` table, showing ₹0. Changed `useRevenueStats` to query `crm_invoices`. Added `staleTime: 5 min`.

3. **`src/tenant/branches-overview-page.tsx`** — "Total Appointments" per branch always 0 (CRM appointments don't carry branch_id). Removed appointments stat entirely; kept "Staff Assigned" count which is accurate from `staff_profiles`.

4. **`src/tenant/staff-page.tsx`** — Edit profile form rendered outside the table (after `</table>`), visually disconnected. Rewrote to render inline as `<tr><td colSpan={6}>` immediately below the target row. Renamed component to `EditProfileInline`.

**Tests:** `npm run typecheck` ✅ `npm run lint` ✅

---

### v7.0.0 — 2026-11-06 12:00 IST — CRM Mirror Tables + Appointments & Billing Sync + Client Name Fix
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Phase 10 — CRM Integration (Step 1 complete)

**What Changed:**
Completed CRM Step 1 — appointments sync, invoices sync, Platform→CRM write-back, and client name on Appointments page.

**Migration — `supabase/migrations/20261110_001_crm_mirror_tables.sql`:**
- `crm_appointments` table: tenant_id, contact_id (FK→contacts, nullable), crm_appointment_id, title, status, scheduled_at, end_at, calendar_id, staff_name, notes, source, raw JSONB
- `crm_invoices` table: tenant_id, contact_id (FK→contacts, nullable), crm_invoice_id, invoice_number, amount, currency, status, due_date, paid_at, source, raw JSONB
- Partial unique indexes on (tenant_id, crm_appointment_id) and (tenant_id, crm_invoice_id)
- RLS: `tenant_id IN (SELECT public.active_tenant_ids())` pattern — set-returning function in subquery, NOT `= ANY()` (PostgREST disallows that)

**Edge Function — `supabase/functions/crm-webhook/index.ts` (extended):**
- Added `isAppointmentEvent` + `isInvoiceEvent` detection (camelCase and snake_case CRM event names)
- Appointment handler: maps CRM fields → `crm_appointments`, resolves `contact_id` via crm_contact_id lookup, manual select/insert/update pattern (PostgREST upsert can't use partial unique indexes)
- Invoice handler: same pattern for `crm_invoices`

**Edge Function — `supabase/functions/crm-sync-contact/index.ts` (NEW):**
- Platform → CRM write-back: authenticates to CRM via email+password JWT, skips contacts with source='crm' (loop prevention), looks up tenant's crm_location_id, creates or updates CRM contact
- Requires secrets: CRM_BASE_URL, CRM_ANON_KEY, CRM_EMAIL, CRM_PASSWORD (deferred — no contact creation UI yet)

**UI Changes:**
- `src/tenant/appointments-page.tsx` — Rewritten: removed useCrmBookings (direct CRM fetch), reads from `crm_appointments` table; added Client column via `contacts(first_name, last_name)` join; handles Supabase type (array vs object) with `Array.isArray()` guard
- `src/tenant/billing-page.tsx` — Rewritten: removed useCrmInvoices/useCrmRevenueSummary, reads from `crm_invoices` table; revenue summary computed client-side from fetched data

**Bug fixed — Clients page navigation:**
- View button used absolute path `/t/clients/${c.id}` (missing slug) → fixed to relative `c.id`
- Client detail breadcrumb used absolute `/t/clients` → fixed to `../clients relative="path"`

**Bug fixed — Client detail "Client not found":**
- `useWellnessClient` only queried by wellness_client.id; CRM contacts have no wellness_clients rows yet
- Fixed: `.or('id.eq.${id},contact_id.eq.${id}')` + `.maybeSingle()` — works for both IDs

**Tests confirmed via curl:** Appointment webhook fired → 2 "Free Consultation" entries appear in Appointments page ✅
**CRM event type setup:** Skipped for now — pipeline proven working. Can add event types in CRM calendar later.

**Tests:** `npm run typecheck` ✅ `npm run lint` ✅

---

### v6.9.0 — 2026-11-05 23:30 IST — CRM Webhook Integration
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Phase 10 — CRM Integration

**What Changed:**
Replaced failing CRM API pull approach with webhook push architecture. CRM now pushes contact events to our Supabase Edge Function, which upserts into our own `contacts` table.

**Files Created/Changed:**
- `supabase/migrations/20261109_001_crm_webhook_mapping.sql` — adds `crm_contact_id TEXT` to `contacts`, `crm_location_id TEXT` to `tenants`, with partial unique indexes
- `supabase/functions/crm-webhook/index.ts` — Deno Edge Function: validates `x-webhook-key` header against `CRM_WEBHOOK_SECRET`, routes ContactCreate/ContactUpdate events, upserts into `contacts` by `tenant_id` (looked up from `crm_location_id`)
- `src/lib/crm/client.ts` — stripped to `crmFetch()` using anon key + session JWT (kept for future CRM write-back)
- `.env.example` — cleaned up; only `VITE_CRM_SUB_ACCOUNT_ID` remains as VITE_ var; webhook secret is a Supabase secret

**Infrastructure:**
- Edge Function deployed: `supabase functions deploy crm-webhook --no-verify-jwt`
- Secret set: `supabase secrets set CRM_WEBHOOK_SECRET=<key>`
- Migration applied: `supabase db push --include-all`
- Tenant mapped: `UPDATE tenants SET crm_location_id = 'f0496963...' WHERE ...`
- CRM workflows created: Contact Created + Contact Updated → Outgoing Webhook → Edge Function URL

**Status:** Webhook fires and reaches Edge Function ✅. Secret validation working ✅. Final end-to-end contact sync test pending (one more contact create in CRM needed to confirm upsert lands in contacts table).

**Tests:** `npm run typecheck` ✅ `npm run lint` ✅

---

### v6.8.0 — 2026-11-05 22:00 IST — Entitlement Activation Bug Fix
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Phase 10 — Module engine bug fix

**Problem:**
Module Activate button showed persistent "Cannot activate: missing required dependencies" even after all dependencies were satisfied. P04 (Membership & Roles), C01–C10 appeared stuck in pending despite P02 (Tenant Management) being activated.

**Root Cause Investigation:**
- DB query `validate_module_dependencies(tenant_id, p04_module_id)` returned **0 rows** — no missing deps at the DB level
- `transition_entitlement` RPC at line 300 of Phase 2 migration throws the error only if that query returns rows
- Confirmed all modules in `healthy-lifestyle` tenant are `status: "active"` in DB — they had been activated successfully on prior attempts/page reloads
- Error was **stale React mutation state**: each `EntitlementRow` holds its own `useTransitionEntitlement()` instance; `transition.isError` stays `true` after a failed call until `.reset()` is called or the component unmounts
- When user clicked "Activate" again, they saw the old error immediately (from prior failed state) even though the new attempt had not been made yet — it looked like a persistent bug but was a React state display issue

**Fix Applied:**
- `src/platform/tenants/entitlement-list.tsx`: Added `transition.reset()` call before every `transition.mutate()` in `handleTransition()`. This clears stale error state before each attempt so a fresh error (if any) reflects the current attempt only.

**DB State (confirmed):**
- All 15 modules in `healthy-lifestyle` tenant: `status = 'active'`, `missing_deps = null`
- P01 ✅ P02 ✅ P04 ✅ P08 ✅ C01–C11 ✅

**Tests:**
- `npm run typecheck` — PASSED (zero errors)

---

### v6.7.0 — 2026-11-05 20:30 IST — Phase 10 Close-Out
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Phase 10 — CRM Adapter close-out

**Task 1 — CRM live data verified:** All 5 CRM env vars confirmed set in `.env`. Clients, Appointments, Billing pages fully wired to MyAppz via CRM adapter. Column names match CRM_ANALYSIS.md schema. No changes required.

**Task 2 — Documents → MyAppz (`contact_documents`):**
- `src/lib/crm/types.ts` — Added `CrmDocument` interface (id, sub_account_id, contact_id, title, file_url, file_type, file_size, uploaded_by, created_at)
- `src/lib/crm/contacts.ts` — Added `getCrmDocuments(contactId?)` — queries `contact_documents` filtered by `sub_account_id`
- `src/hooks/use-crm-documents.ts` (NEW) — `useCrmDocuments(contactId?)` with `staleTime: 5 min`
- `src/tenant/documents-page.tsx` (NEW) — Table view with search, file icon by type, size format, Download link, error state; replaces PlaceholderPage
- `src/app.tsx` — `/t/:slug/documents` now renders `<TenantRoute><DocumentsPage /></TenantRoute>`

**Task 3 — Support Ops Shell (`/support/`):**
- `src/components/support-shell.tsx` (NEW) — Dedicated sidebar shell for support_ops: dark slate theme, 3 nav items (Overview, Delegations, Action Requests)
- `src/platform/support/support-home.tsx` (NEW) — Overview: 3 stat tiles (active grants, expired/revoked, tenants in scope), tenant access cards, grants table filtered to current user
- `src/platform/support/support-delegations-page.tsx` (NEW) — Full grants table (filtered by user for support_ops, all for super_admin): grantee, permission key, tenant scope, status badge, expiry, approval flag
- `src/platform/support/support-requests-page.tsx` (NEW) — Action requests with Pending/All tabs, inline approve/reject form with reason field, status badges
- `src/app.tsx` — Added `/support` route block with `SupportShell`; `RoleRedirect` now sends `support_ops` → `/support` instead of `/`

**typecheck:** PASSED (zero errors)
**lint:** PASSED (zero warnings)

---

### v6.6.0 — 2026-11-05 19:30 IST — Tenant Slug URLs
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Phase 10 — CRM Adapter / Platform Polish

**What changed:** Tenants now have clean slug-based URLs. Navigating to `/t/healthy-fitness/dashboard` loads Healthy Fitness's tenant shell. Previously all tenant routes used `/t/xxx` with no tenant identifier in the URL.

**Migration — `supabase/migrations/20261108_001_tenant_slug.sql`:**
- Added `generate_tenant_slug(TEXT) → TEXT` SQL function: lowercases, replaces non-alphanumeric with `-`, trims leading/trailing dashes
- Added `slug TEXT NOT NULL UNIQUE` column to `tenants` table
- Backfilled existing tenants: `slug = generate_tenant_slug(business_name)`
- Added `idx_tenants_slug` index for fast URL resolution

**Types — `src/types/auth.ts`:**
- Added `activeTenantSlug: string | null` to `AuthState` interface

**Auth store — `src/hooks/use-auth.ts`:**
- Added `_tenantSlugs: Record<string, string>` (internal tenantId → slug map)
- Renamed `setMemberships` → `setMembershipsWithSlugs(memberships, slugMap)` — receives slug map alongside memberships
- `fetchMemberships()` now joins `tenants(slug)` and returns `{ memberships, slugMap }`
- `setActiveTenant()` now also sets `activeTenantSlug` from the slug map
- `signOut()` clears `activeTenantSlug` and `_tenantSlugs`

**New context — `src/contexts/tenant-context.tsx`:**
- `TenantContextProvider` and `useTenantContext()` — provides `{ tenantId, slug }` to all children inside TenantShell
- Replaces reading `activeTenantId` from auth store inside tenant pages

**New hook — `src/hooks/use-tenant-by-slug.ts`:**
- `useTenantBySlug(slug)` — queries `tenants` table by slug, returns full Tenant record
- `staleTime: 10 min` (tenant records rarely change)

**Nav config — `src/lib/nav-config.ts`:**
- Replaced static `/t/xxx` nav arrays with `tenantNav(slug)` factory function
- All tenant nav hrefs are now dynamic: `/t/${slug}/dashboard`, `/t/${slug}/clients`, etc.
- `getNavForRole()` accepts new `slug` parameter (5th argument, defaults to `""`)

**TenantShell — `src/components/tenant-shell.tsx` (full rewrite):**
- Reads `slug` from `useParams<{ slug: string }>()`
- Calls `useTenantBySlug(slug)` to resolve tenantId
- Shows LoadingScreen while tenant resolves; shows error if slug not found
- Access guard: super_admin/support_ops bypass membership check; others must have active membership
- Provides `TenantContextProvider` wrapping `ShellLayout`
- Passes `slug` to `getNavForRole()` for dynamic hrefs

**TenantRoute — `src/app.tsx`:**
- Now reads `tenantId` from `useTenantContext()` instead of auth store

**RoleRedirect — `src/app.tsx`:**
- Redirects to `/t/${activeTenantSlug}/dashboard` (slug-based)
- Shows `LoadingScreen` while slug is loading (tenantId set but slug not yet)

**TenantDashboard — `src/tenant/tenant-dashboard.tsx`:**
- Changed from `activeTenantId` from auth store → `useTenantContext()` for tenantId

**TenantSettingsPage — `src/tenant/tenant-settings-page.tsx`:**
- Changed from `activeTenantId` from auth store → `useTenantContext()` for tenantId

**Routing — `src/app.tsx`:**
- `/t` → `/t/:slug` (all tenant routes now include slug)

**typecheck:** PASSED (zero errors)
**lint:** PASSED (zero warnings)

---

### v6.1.0 — 2026-11-05 12:30 IST — Auth: Password Reset Flow
**Phase:** Phase 1 close-out (auth completeness)
**Author:** Claude Sonnet 4.6 + Venkatesh

**Changes:**
- `src/platform/auth/login-page.tsx` — Added `"forgot"` mode (third state); "Forgot password?" link below Sign In button; calls `supabase.auth.resetPasswordForEmail()` with `redirectTo: window.location.origin + '/auth/reset'`; password field hidden in forgot mode
- `src/platform/auth/reset-password-page.tsx` — NEW: listens for `PASSWORD_RECOVERY` event from `supabase.auth.onAuthStateChange`; shows new-password + confirm form; calls `supabase.auth.updateUser({ password })`; redirects to `/` on success; "waiting for confirmation" state while token not yet detected
- `src/app.tsx` — Restructured routing: `/auth/reset` is now a **public route outside AuthGate**; all other routes wrapped in `<Route path="*">` → AuthGate → inner Routes

**Why:** Supabase dashboard no longer shows direct password edit UI. Reset link emails go to localhost — app had no `/auth/reset` handler so the link failed with ERR_CONNECTION_REFUSED.

**Tests:** typecheck PASSED, lint PASSED. Password reset verified end-to-end: forgot → email → link → reset page → new password → dashboard login.

---

### v6.5.0 — 2026-11-05 17:30 IST — Fix Tenant Shell Nav + Due Tasks Updated
**Phase:** Phase 3 close-out (role-based navigation)
**Author:** Claude Sonnet 4.6 + Venkatesh

**Changes:**
- `src/lib/nav-config.ts` — Added `context: "platform" | "tenant"` parameter to `getNavForRole()`. When `context = "tenant"`, skips the platform_role check and uses tenant role nav directly. Super admin inside `/t/*` now sees Clients, Appointments, Billing etc. — not Tenants/Modules/Delegation.
- `src/components/tenant-shell.tsx` — Passes `context: "tenant"` to `getNavForRole()`.
- `due tasks.md` — Fully rewritten with current project state: completed phases, in-progress items, ordered pending work (Phase 6 → Support Ops shell → Phase 7 → 8 → 9 → 12 → 13).

**Root cause:** `getNavForRole()` checked `platform_role === 'super_admin'` first and always returned Platform Nav, even inside the Tenant Shell.

**Tests:** typecheck PASSED, lint PASSED.

---

### v6.4.0 — 2026-11-05 16:30 IST — Fix Audit actor_role Always NULL
**Phase:** Phase 10 — Audit Bug Fix
**Author:** Claude Sonnet 4.6 + Venkatesh

**Root cause:** `log_audit_event()` trigger was inserting into `audit_logs` without setting `actor_role` — the column was always NULL. Role filter in the new Audit Log UI returned 0 results for every selection.

**Fix:**
- `supabase/migrations/20261107_001_fix_audit_actor_role.sql` — Rewrites `log_audit_event()` to lookup `platform_users.platform_role` for the acting user and store it as `actor_role`. Also runs a backfill: `UPDATE audit_logs SET actor_role = platform_users.platform_role WHERE actor_id IS NOT NULL AND actor_role IS NULL`. **Applied via `supabase db push`.**

**Note:** Entries where `actor_id IS NULL` (migration-time inserts with no user session) remain with `actor_role = NULL` — those cannot be backfilled since the actor is unknown.

**Tests:** typecheck PASSED, lint PASSED. Migration applied.

---

### v6.3.0 — 2026-11-05 15:30 IST — Audit Log Redesign + 90-day Cleanup
**Phase:** Phase 10 — Audit Enhancement
**Author:** Claude Sonnet 4.6 + Venkatesh

**Changes:**
- `supabase/migrations/20261106_001_audit_log_cleanup_cron.sql` — NEW: pg_cron job `cleanup-audit-logs` runs daily at 03:00 UTC, deletes `audit_logs` rows older than 90 days. **Applied via `supabase db push`.**
- `src/hooks/use-audit-logs.ts` — Rewritten: accepts `AuditFilters` (tab, actorRole, entityType, dateFrom, dateTo); joins `platform_users(full_name)` so actor name shows instead of UUID; `staleTime: 30s`; server-side filtering for tab (system = INSERT/UPDATE/DELETE, user = everything else)
- `src/platform/audit/audit-page.tsx` — Full redesign:
  - **Three tabs**: All Activity / System Events / User Activity
  - **Filter bar**: Role dropdown (all roles), Entity/Table text search, Date From, Date To, Clear filters button
  - **Fixed Details button**: now inline row-expand (click anywhere on row) with chevron icon; shows actor_id, record_id, tenant_id, details JSON — all in an accordion row below
  - **Actor name column**: shows `full_name` from platform_users join (was showing nothing before)
  - **Operation badge**: colour-coded (green=INSERT, blue=UPDATE, red=DELETE, purple=page.view, gray=other)

**Tests:** typecheck PASSED, lint PASSED. Both migrations applied to linked Supabase project.

---

### v6.2.0 — 2026-11-05 13:00 IST — Frontend Activity Logger
**Phase:** Phase 10 — CRM Adapter + Audit Enhancement
**Author:** Claude Sonnet 4.6 + Venkatesh

**Changes:**
- `supabase/migrations/20261105_001_activity_log_rpc.sql` — NEW: `log_user_activity(p_action, p_entity_type, p_entity_id, p_details)` RPC; SECURITY DEFINER (bypasses RLS safely); resolves `platform_users.id` from `auth.uid()`; looks up active membership for role + tenant_id; inserts into `audit_logs`; GRANT EXECUTE to authenticated role. **Applied via `supabase db push`.**
- `src/hooks/use-activity-log.ts` — NEW: `useActivityLog()` hook returns `log(action, entityType, entityId?, details?)` function; `usePageView(page, details?)` hook fires once on mount via `useRef` guard (prevents double-fire in React StrictMode)
- `src/platform/dashboard/dashboard-page.tsx` — `usePageView("platform.dashboard")`
- `src/tenant/clients-page.tsx` — `usePageView("clients")`
- `src/tenant/appointments-page.tsx` — `usePageView("appointments")`
- `src/tenant/billing-page.tsx` — `usePageView("billing")`
- `src/tenant/reports-page.tsx` — `usePageView("reports")`

**What this adds:** Every time a user visits these pages, a row is written to `audit_logs` with `action = "page.view"`, actor_id, actor_role, tenant_id, timestamp. Frontend actions (views, searches) are now captured alongside DB-trigger events. The existing Audit Log viewer shows them all together.

**CRM quota note:** `useRef` guard ensures page view is logged exactly once per mount — no repeated calls on re-renders.

**Tests:** typecheck PASSED, lint PASSED. Migration applied to linked Supabase project.

---

### v0.0.1 — Project Initialization
**Date:** 2026-10-28 14:00 IST  
**Author:** Claude (Opus 4.6) + Venkatesh  
**Phase:** Phase 0 — Architecture Blueprint

**Changes:**
- Initialized empty git repository
- Created `.gitignore` for Node/Vite/Supabase project
- Created `LOGBOOK.md` (this file) for version tracking
- Created `docs/ARCHITECTURE.md` — system architecture blueprint
- Created `docs/PROJECT_STRUCTURE.md` — proposed folder layout
- Created `supabase/` directory structure for future migrations
- Created `CLAUDE.md` for Claude Code project instructions

**Workspace Status:** Empty greenfield project. No code, no dependencies, no Supabase project yet.

**Decisions Made:**
- Product name recommendation: **WellnessOS** (first vertical under UNIKLIFE.AI platform)
- Industry key: `HEALTH_WELLNESS`
- All 24 modules mapped to weight-loss/fitness/wellness applicability
- Git initialized, Phase 0 architecture-only mode

**Pending Owner Approval:**
- [ ] Confirm vertical product name (WellnessOS or alternative)
- [x] ~~Review and approve Architecture document~~ → Superseded by v0.2.0
- [ ] Approve Phase 1 implementation start
- [ ] Confirm Supabase `uniklife-dev` project creation

---

### v0.1.0 — CRM Analysis
**Date:** 2026-10-28 15:30 IST  
**Author:** Claude (Opus 4.6) + Venkatesh  
**Phase:** Phase 0 — Architecture Blueprint

**Changes:**
- Created `docs/CRM_ANALYSIS.md` — full analysis of existing SaaSUniverse/MyAppz CRM
- Identified 1,967 tables, ~500 RPC functions in existing CRM backend
- Mapped CRM capabilities vs what WellnessOS must build new

**Decisions Made:**
- Existing CRM identified as GoHighLevel-style white-label SaaS (SaaSUniverse/MyAppz)
- 10 wellness-specific capabilities identified that CRM does NOT have

---

### v0.2.0 — Architecture v2 (Final Decisions)
**Date:** 2026-10-28 16:00 IST  
**Author:** Claude (Opus 4.6) + Venkatesh  
**Phase:** Phase 0 — Architecture Blueprint

**Changes:**
- Created `docs/ARCHITECTURE_v2.md` — complete revised architecture
- Incorporated all 7 final owner decisions
- Added: Architecture Decisions Register (13 decisions)
- Added: Five-layer architecture diagram with clear Layer 1–5 separation
- Added: Five-tier user hierarchy with authorization resolution algorithm
- Added: Support delegation rules (deny-by-default, no self-grant)
- Added: Module ownership matrix — 11 Platform + 11 Core + 24 Wellness + 10 Add-Ons
- Added: Full Supabase data model (~60 tables across 3 domains)
- Added: RLS strategy with health data sensitivity escalation
- Added: Integration gateway design (CRM adapter disabled/mock)
- Added: 10-phase development sequence with negative test requirements
- Added: Open decisions table (7 items requiring owner approval)

**Critical Architecture Decisions Reflected:**
1. Platform is INDEPENDENT — not embedded in or dependent on existing CRM
2. Global SaaS Core built FIRST, wellness vertical on top
3. Independent Supabase Auth with 5-tier hierarchy
4. CRM = optional future connector only (disabled/mock adapter)
5. All 24 wellness modules preserved + 10 optional add-ons
6. Standard Supabase deployment (dev → demo → prod)
7. No code until owner approves implementation plan

**Pending Owner Approval:**
- [x] ~~Review and approve ARCHITECTURE_v2.md~~ → Owner reviewed, 10 corrections issued → v0.3.0
- [x] ~~UI library~~ → shadcn/ui + Tailwind CSS APPROVED
- [x] ~~State management~~ → TanStack Query + Zustand APPROVED
- [ ] Approve Phase 1 scope and start
- [ ] Confirm Supabase `uniklife-dev` project creation

---

### v0.3.0 — Architecture Corrections (Owner Review Feedback)
**Date:** 2026-10-28 17:30 IST  
**Author:** Claude (Opus 4.6) + Venkatesh  
**Phase:** Phase 0 — Architecture Blueprint

**Trigger:** Owner reviewed v0.2.0 and issued 10 architectural corrections.

**Changes — Architecture (ARCHITECTURE_v2.md → v0.3.0):**
- Correction #1: Resolved identity model — defined auth.users → platform_users → tenant_memberships → branch_assignments chain with identity resolution functions
- Correction #2: Redesigned health-data access — assignment-based via coach_assignments, not role-only. Tenant Admin gets operational summaries only, not raw clinical data
- Correction #3: Replaced Super Admin service-role bypass with scoped privileged backend functions (each logged, some require legal_ref)
- Correction #4: Normalized support delegation with proper constraints (no self-grant CHECK, mandatory expiry, permission precedence rules, approval queue with no self-approval)
- Correction #5: Removed duplicate module_dependencies table. Single authoritative dependency system in global_modules.dependencies JSONB
- Correction #7: Defined backend runtime — PostgREST for user ops, Edge Functions for privileged/complex ops, pg_cron for background jobs, Supabase Vault for secrets. Cloudflare Workers = static hosting only.
- Correction #8: Split Phase 4 into milestones 4A–4H (client identity, appointments, programs, assessments, progress, care plans, nutrition, integration test)
- Correction #9: Defined enrollment/finance decoupling — interim payment status interface on wellness_enrollments, auto-synced when Finance Core ships in Phase 5
- Correction #10: Expanded Phase 1 security tests — cross-tenant FK attacks, branch access, health data unauthorized reads, client identity linking, privilege escalation, delegation constraints

**New Documents Created:**
- `docs/DATABASE.md` — Full schema with 52 tables, proper FKs, tenant-scoped uniqueness, NUMERIC(12,2) for money, booking concurrency controls, care plan approval integrity checks, indexes on all FKs and query patterns
- `docs/SECURITY.md` — Threat model, RLS policy templates, authorization by tier, cross-tenant FK attack prevention, privileged operations catalog, data classification, compliance considerations
- `docs/MODULES.md` — All 56 modules (11 platform + 11 core + 24 wellness + 10 add-ons) with dependencies, phase assignments, table ownership, applicability matrix
- `docs/PRD.md` — Product vision, target users, market context, differentiators, non-goals, technology decisions, design direction, success criteria

**Decisions Updated:**
- AD-11: shadcn/ui + Tailwind CSS → APPROVED
- AD-13: TanStack Query + Zustand → APPROVED
- AD-16–19: New decisions confirmed (identity model, health-data access, Super Admin scoping, backend runtime)

**Pending Owner Approval:**
- [x] ~~Review and approve Architecture v0.3.0~~ → APPROVED 2026-10-28
- [x] ~~Approve Phase 1 scope and start~~ → APPROVED 2026-10-28

---

### v1.0.0 — Phase 1 Foundation Complete
**Date:** 2026-10-29 IST  
**Author:** Claude (Opus 4.6) + Venkatesh  
**Phase:** Phase 1 — Foundation

**Changes:**
- **Infrastructure:** Vite 8 + React 19 + TS 6 + Tailwind v4 scaffolding, Supabase linked (ap-south-1)
- **Migration `20261028_001`:** 11 tables (platform_users, tenants, branches, tenant_memberships, branch_assignments, support_permission_grants, support_action_requests, audit_logs, privileged_operation_log, health_data_access_log, tenant_branding)
- **RLS:** Enabled on all 11 tables with identity resolution functions (platform_user_id, active_tenant_ids, tenant_role, is_super_admin, has_branch_access)
- **Auth:** Login/signup pages, Zustand auth store, auth listener, auth gate, auto-create platform_users trigger, super admin auto-promotion trigger
- **Types:** Full TypeScript types for auth, tenants, branches, delegations
- **Hooks:** TanStack Query hooks for tenants, branches, memberships, branch assignments, delegations, action requests, audit logs
- **UI Pages:** Dashboard (4 stat cards), tenant list/create/edit/detail, branch list/create/edit, member list/add/role change, branch assignments, delegation grants/revoke, action requests, audit log viewer, privileged operation log
- **Sidebar:** React Router NavLink with active state highlighting

**Bugs Fixed During Phase 1:**
- `created_by` null on tenant creation — added user.id from auth store
- `invited_by` null on membership creation — same fix
- Audit log UI using wrong column names (table_name → entity_type, record_id → entity_id)
- Dashboard shell using `<a>` tags instead of React Router `NavLink`

**Security Fix:**
- **Migration `20261029_002`:** Cross-tenant branch assignment vulnerability — `branch_assign_insert` RLS policy did not verify branch and membership belong to same tenant. Fixed with subquery join check.

**Acceptance Tests:** 25/25 passed (supabase/tests/phase1_acceptance.sql)
- P1–P6: Positive scenarios
- N7–N11: Cross-tenant isolation
- N12–N13: Branch access
- N14–N17: Health data
- N18–N19: Customer isolation
- N20–N22: Privilege escalation
- N23a–N23b: Delegation constraints
- N25: Revoked grants

---

### v2.0.0 — Phase 2 Module Engine Complete
**Date:** 2026-10-29 IST  
**Author:** Claude (Opus 4.6) + Venkatesh  
**Phase:** Phase 2 — Module Engine

**Changes:**
- **Migration `20261030_001`:** 8 new tables (industry_profiles, tenant_industries, global_modules, tenant_entitlements, tenant_feature_settings, tag_definitions, entity_tags, tenant_vocabulary)
- **FK added:** tenants.primary_industry_id → industry_profiles
- **RLS:** Enabled on all 8 tables with appropriate policies (super_admin write, tenant_admin partial write, authenticated read)
- **Audit triggers:** On tenant_entitlements, global_modules, industry_profiles, tenant_feature_settings
- **Seed data:** 5 industry profiles (Health & Wellness active, 4 others draft), 56 modules (11 platform, 11 core, 24 vertical, 10 addon) with full JSONB dependency graphs
- **Entitlement functions:**
  - `tenant_has_module(tenant_id, module_key)` — checks active entitlement
  - `validate_module_dependencies(tenant_id, module_id)` — returns missing required deps
  - `check_module_dependents(tenant_id, module_key)` — returns active modules that depend on this one
  - `transition_entitlement(id, new_status, actor_id, reason)` — full state machine with dependency validation, auto-audit logging
- **State machine:** PENDING → ACTIVE → SUSPENDED/DISABLED → reactivate/re-assign. EXPIRED → re-assign. Invalid transitions blocked.
- **Types:** module.ts (IndustryProfile, GlobalModule, TenantEntitlement, TenantFeatureSetting, TagDefinition, EntityTag, TenantVocabulary)
- **Hooks:** use-industries (CRUD), use-modules (list/detail/update), use-entitlements (assign/transition/remove)
- **UI Pages:**
  - `/industries` — Industry Registry with cards, create/edit dialogs
  - `/modules` — Module Registry with layer filter, search, expandable dependency viewer
  - Tenant detail page — EntitlementList with assign, activate/suspend/disable/remove actions

**Acceptance Tests:** 29/29 passed (supabase/tests/phase2_acceptance.sql)
- T1: Industry profiles seeded (5+)
- T2: 56 modules seeded
- T3a-d: Layer distribution correct (11/11/24/10)
- T4: Super admin assigns module (pending)
- T5: Transition pending → active
- T6-T7: tenant_has_module true/false
- T8: Activate with dependency met (P02 needs P01)
- T9: Activate blocked when dependency missing (C01 needs P04)
- T10: Disable blocked when dependents exist (P01 has P02)
- T11: Suspend works (no dependent check)
- T12: Suspended module not reported as active
- T13: Reactivate from suspended
- T14: Invalid transition blocked (active → expired)
- T15: Tenant admin cannot insert entitlements (RLS)
- T16-T17: Tenant members can read entitlements
- T18: All users see all modules
- T19: Non-admin cannot modify global_modules
- T20a-b: Industry profiles read/write RLS
- T21: Tenant admin creates tenant-scoped tags
- T22: Tenant admin blocked from platform tags
- T23: Tenant admin sets custom vocabulary
- T24: Tenant admin toggles feature flags
- T25: Audit log captures entitlement transitions

---

### v5.2.0 — Phase 5A Practitioner Workspace Complete
**Date:** 2026-11-02 IST  
**Author:** Claude (Sonnet 4.6) + Venkatesh  
**Phase:** Phase 5 — Wellness Operations (5A: Practitioner Workspace)

**Migration `20261103_001_phase5a_practitioner_workspace.sql`:**
- `client_notes` — session/progress/alert/follow-up notes written by practitioners
- Note types: session, progress, general, alert, follow_up
- `is_private` flag — private notes only visible to the author
- RLS: author always reads own notes; assigned practitioners read non-private notes for their clients; tenant_admin reads all non-private; only practitioner/admin can write
- Audit trigger on client_notes

**TypeScript Types (`src/types/workspace.ts`):**
- NoteType, ClientNote, WorkspaceAppointment

**Hooks:**
- `use-workspace.ts` — useTodayAppointments (per practitioner), useAllTodayAppointments (admin view), auto-refetch every 60s
- `use-client-notes.ts` — useClientNotes, useAddClientNote, useDeleteClientNote

**UI — `src/tenant/workspace-page.tsx`:**
- Greeting with practitioner's first name + current date
- 4 stat chips: Today's Total, In Queue, Completed, No-Shows
- Today's Schedule timeline: appointment cards with time, avatar, service, status badge, and status-action buttons (Confirm → Check In → Start → Complete, No Show)
- In-progress appointments highlighted with orange ring + pulse dot
- Client Queue panel (checked-in + in-progress, real-time feel)
- Upcoming panel (scheduled + confirmed)
- **Quick Note dialog**: note type selector, textarea, private toggle — linked to appointment and wellness client
- Schedule auto-refreshes every 60 seconds

**Nav:** Workspace added to tenant_admin and practitioner sidebar with `Stethoscope` icon at `/t/workspace`

**Note:** Supabase CLI strips date underscores — both `20261102_001` and `20261102_002` resolve to version `20261102`. Phase 5A renamed to `20261103_001` to avoid collision. Rule: each new migration needs a unique date prefix.

---

### v5.1.0 — Phase 5B Finance Core Complete
**Date:** 2026-11-02 IST  
**Author:** Claude (Sonnet 4.6) + Venkatesh  
**Phase:** Phase 5 — Wellness Operations (5B: Finance Core)

**Migration `20261102_001_phase5b_finance_core.sql`:**
- `invoice_items` — line items for invoices with GENERATED ALWAYS AS computed `total` column
- `payments` — payment records per invoice (cash/card/UPI/bank_transfer/cheque/other)
- `invoice_summary` view — invoices joined with paid/outstanding computed amounts
- RLS on both tables (tenant_admin + staff write, tenant members read)
- Audit triggers on invoices and payments
- Auto-status update on payment: full payment → "paid", partial → "partial"

**TypeScript Types (`src/types/finance.ts`):**
- Invoice, InvoiceItem, Payment, InvoiceSummary, CreateInvoiceInput, RecordPaymentInput, PaymentMethod, PaymentStatus

**Hooks:**
- `use-invoices.ts` — useInvoices (via view), useInvoice, useCreateInvoice (creates invoice + items atomically), useUpdateInvoiceStatus, useInvoiceItems
- `use-payments.ts` — usePayments, usePaymentsByTenant, useRecordPayment, useRevenueSummary

**UI Pages:**
- `src/tenant/billing-page.tsx` — Invoice list with 4 stat cards (this month, total revenue, outstanding, overdue count), status filter, search, Create Invoice dialog with dynamic line items
- `src/tenant/invoice-detail-page.tsx` — Invoice detail with line items table, payment history, summary panel, Record Payment dialog (auto-marks invoice paid/partial on save)

**Nav:** Billing added to tenant_admin and staff sidebar (module key C04), `Receipt` icon from lucide-react

---

### v6.0.0 — Phase 10 CRM Adapter (MyAppz Integration)
**Date:** 2026-11-05 14:30 IST
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Phase 10 — MyAppz CRM Integration

**Adapter layer `src/lib/crm/`:**
- `client.ts` — Supabase client pointed at `myappzbackend.com`, auth-disabled (key-only), reads `VITE_CRM_BASE_URL` + `VITE_CRM_API_KEY` + `VITE_CRM_SUB_ACCOUNT_ID` from env
- `types.ts` — `CrmContact`, `CrmBooking`, `CrmInvoice`, `CrmPayment` TypeScript interfaces
- `contacts.ts` — `getCrmContacts()`, `getCrmContact(id)`, `searchCrmContacts(query)` — queries `contacts` table filtered by `sub_account_id`
- `appointments.ts` — `getCrmBookings(opts)`, `getCrmBooking(id)` — queries `calendar_bookings` with optional date/status/contact filters
- `billing.ts` — `getCrmInvoices(opts)`, `getCrmInvoice(id)`, `getCrmPayments(invoiceId)`, `getCrmRevenueSummary()` — queries `invoices` + `payment_gateway_transactions`
- `index.ts` — single barrel export

**TanStack Query hooks:**
- `use-crm-contacts.ts` — `useCrmContacts`, `useCrmContact`, `useCrmContactSearch`
- `use-crm-appointments.ts` — `useCrmBookings`, `useCrmBooking`
- `use-crm-billing.ts` — `useCrmInvoices`, `useCrmInvoice`, `useCrmPayments`, `useCrmRevenueSummary`

**Pages redirected to CRM:**
- `clients-page.tsx` — now reads from CRM `contacts` table. Shows name, email/phone, city/state, added date. Error banner if key missing.
- `appointments-page.tsx` — now reads from CRM `calendar_bookings`. Date-from filter + status filter. Shows time, title, status, location, notes.
- `billing-page.tsx` — now reads from CRM `invoices`. Revenue summary from `getCrmRevenueSummary()`. Invoice table with status badges.

**Config:**
- `.env.example` updated with `VITE_CRM_BASE_URL`, `VITE_CRM_API_KEY`, `VITE_CRM_SUB_ACCOUNT_ID`
- Sub-account ID baked in: `f0496963-3208-4c23-a541-693b1068e3f7`
- `eslint.config.js` — added `argsIgnorePattern: "^_"` and `varsIgnorePattern: "^_"` to allow intentionally unused params

**CLAUDE.md** — added "API Keys — Strict Rule": never ask for keys in chat; write code with `.env` placeholders, tell owner where to paste.

**Status:** Adapter built and typecheck+lint PASSED. Waiting for `VITE_CRM_API_KEY` to be pasted into `.env`. Column names may need adjustment after first live test.

**Remaining for Phase 10:**
- Paste CRM API key into `.env`, verify live data loads
- Adjust table/column names if MyAppz schema differs
- Redirect Documents page to `contact_documents`

---

### v5.7.0 — Support Ops Infrastructure Migration
**Date:** 2026-11-04 ~18:00 IST
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Phase 1 close-out (support delegation hardening)

**Migration `20261104_001_support_ops_infra.sql`:**
- `expire_stale_grants()` function — flips `support_permission_grants.status` from `active` → `expired` when `expires_at < now()`
- `cron.schedule('expire-support-grants', '0 * * * *', ...)` — pg_cron job runs every hour
- `validate_support_grant(grantee_user_id, permission_key, tenant_id, action)` RPC — called by the `support-action` Edge Function; returns grant row only if status=active, not expired, tenant-scoped, and action is in allowed_actions

**Note:** This migration completes the Phase 1 exit criteria items for `expire_stale_grants()` pg_cron and `validate_support_grant()` RPC which were listed as done in CLAUDE.md but not yet logged here.

---

### v5.6.0 — Phase 5F Progress Reviews Complete
**Date:** 2026-11-04 ~17:00 IST
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Phase 5 — Wellness Operations (5F: Progress Reviews)

**UI — `src/tenant/progress-reviews-page.tsx` (524 lines):**
- Two-tab layout: Check-ins | Goals
- **Check-ins tab:** Pending check-ins list with Complete action; completed check-ins table (client, date, mood, notes)
- **Complete check-in modal:** Mood score selector (1–5 with labels), notes textarea, marks `completed_at` on save
- **Goals tab:** Goals table with client, title, progress bar (current/target + %), due date, status badge
- Inline status dropdown to transition goals (not_started → in_progress → achieved / abandoned)
- **Add Goal modal:** Client selector, title, description, target value + unit, due date

**Data sources:** `client_goals` and `check_ins` tables (both added in Phase 4 migration)

**Hooks (inline in page):** `useClientGoals`, `useCheckIns`, `useCompleteCheckIn`, `useUpdateGoalStatus`, `useCreateGoal`

**Types used:** `GoalStatus` from `src/types`

---

### v5.5.0 — Phase 5E Multi-Branch Operations Complete
**Date:** 2026-11-04 ~16:30 IST
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Phase 5 — Wellness Operations (5E: Multi-Branch)

**UI — `src/tenant/branches-overview-page.tsx` (117 lines):**
- Branch cards grid (responsive: 1 → 2 → 3 columns)
- Each card shows: branch name, city/state, active/primary status badge
- Live stats per branch: total appointments, staff assigned (pulled from `appointments` and `staff_profiles` tables)
- Contact details (phone, email) when available

**Hook (inline):** `useBranchStats` — parallel queries to `appointments` and `staff_profiles`, aggregated by `branch_id`

---

### v5.4.0 — Phase 5D Reports & Analytics Complete
**Date:** 2026-11-04 ~16:00 IST
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Phase 5 — Wellness Operations (5D: Reports)

**UI — `src/tenant/reports-page.tsx` (227 lines):**
- **Revenue section:** 3 stat cards (Total Invoiced, Collected, Outstanding) in INR; invoice status breakdown chips
- **Wellness KPIs section:** 4 metric tiles (Active Clients, Active Enrollments, Plans Pending Approval, Measurements Logged)
- **Program Enrollment section:** Table with program name, total enrolled, active count, completed count, completion rate progress bar

**Hooks (inline):** `useRevenueStats` (from `invoices`), `useWellnessStats` (parallel counts across 4 tables), `useProgramEnrollmentStats` (enrollments joined to programs, aggregated client-side)

---

### v5.3.0 — Phase 5C Staff Management Complete
**Date:** 2026-11-04 ~15:30 IST
**Author:** Claude (Sonnet 4.6) + Venkatesh
**Phase:** Phase 5 — Wellness Operations (5C: Staff Management)

**UI — `src/tenant/staff-page.tsx` (202 lines):**
- Staff table: name/email, role badge, job title, branch, status badge, Edit Profile toggle
- Inline edit row (expands below the row): job title, specialization, branch selector, hire date, bio, status (active/on_leave/terminated)
- Uses `useUpsertStaffProfile` — creates or updates `staff_profiles` row for the member

**Hooks:** `useStaffProfiles`, `useUpsertStaffProfile` added to `src/hooks/use-staff.ts`

**Types:** `StaffStatus` used from `src/types`

---

### v4.0.0 — Phase 4 Wellness Core Complete
**Date:** 2026-10-30 IST  
**Author:** Claude (Sonnet 4.6) + Venkatesh  
**Phase:** Phase 4 — Wellness Core

**Migration `20261030_002_phase4a_wellness_core.sql`:**
- 23 new tables across Domain 2 (Shared Business Core) and Domain 3 (WellnessOS)
- Domain 2: contacts, leads, lead_activities, documents, staff_profiles, services, availability_slots, appointments, invoices
- Domain 3: wellness_clients, coach_assignments, health_assessments (sensitivity_level: standard/restricted), health_measurements, care_plans, care_plan_versions, wellness_programs, wellness_enrollments, food_items, recipes, recipe_ingredients, meal_plans, meal_plan_items, nutrition_entries
- RLS on all 23 tables — health_assessments, health_measurements, care_plans, care_plan_versions use coach_assignments subquery for stricter practitioner-gated access
- food_items is a global reference table (read by all, write by super_admin only)
- recipes can be global (tenant_id IS NULL) or tenant-scoped
- Audit triggers on contacts, wellness_clients, appointments, health_assessments, health_measurements, care_plans, wellness_enrollments
- FK: leads.enrollment_id → wellness_enrollments; care_plans.current_version_id → care_plan_versions (circular — added after both tables created)

**TypeScript Types (`src/types/wellness.ts`):**
- 21 type aliases + 14 interfaces covering all Phase 4 entities
- Exported via src/types/index.ts

**Hooks:**
- `use-contacts.ts` — useContacts, useContact, useCreateContact, useUpdateContact
- `use-wellness-clients.ts` — useWellnessClients, useWellnessClient, useCreateWellnessClient, useUpdateWellnessClient
- `use-appointments.ts` — useAppointments, useCreateAppointment, useUpdateAppointmentStatus, useServices, useCreateService
- `use-programs.ts` — usePrograms, useCreateProgram, useUpdateProgram, useEnrollments, useEnrollClient, useUpdateEnrollmentStatus
- `use-health.ts` — useHealthAssessments, useCreateHealthAssessment, useHealthMeasurements, useLogMeasurement, useCarePlans, useCreateCarePlan

**UI Pages:**
- `src/tenant/clients-page.tsx` — Client list with search, Add Client dialog (creates contact + wellness_client in one flow)
- `src/tenant/client-detail-page.tsx` — Client detail with 6 tabs: Overview (vitals snapshot), Assessments, Progress (measurement history table), Care Plans, Programs (enrollments), Appointments

**Routing (`src/app.tsx`):**
- `/t/clients` → ClientsPage (injected with activeTenantId via TenantRoute wrapper)
- `/t/clients/:clientId` → ClientDetailPage
- `TenantRoute` wrapper component injects activeTenantId from auth store into child pages

**Auth (`src/hooks/use-auth.ts`):**
- Added `useAuth` as alias for `useAuthStore` for convenience

---

### v3.0.0 — Phase 3 White-Label & Navigation Complete
**Date:** 2026-10-29 IST  
**Author:** Claude (Opus 4.6) + Venkatesh  
**Phase:** Phase 3 — White-Label & Navigation

**Changes:**
- **Branding CRUD:** `use-branding.ts` hook with upsert (leverages existing `tenant_branding` table from Phase 1). BrandingSection component with color pickers, gradient config, domain, email settings.
- **TenantBranding type extended:** Added sidebar_gradient_from/to, email_sender_name/address, support_email, privacy_notice_url, light_theme, dark_theme, timestamps.
- **Role-based navigation:** `nav-config.ts` — `getNavForRole()` computes sidebar items from platform_role + tenant_role + active entitlement module keys. Module-gated items hidden when entitlement not active.
- **Three shell layouts:**
  - `DashboardShell` — Platform admin (super_admin/support_ops), routes at `/`
  - `TenantShell` — Tenant users (tenant_admin/practitioner/staff), routes at `/t/*`, reads branding for custom sidebar colors + business name
  - `CustomerPortalShell` — Customer role, routes at `/portal/*`, branded
- **Reusable ShellLayout:** Shared component supporting custom gradient colors from tenant branding.
- **Route structure:** `/` = platform admin, `/t/*` = tenant user, `/portal/*` = customer portal. Placeholder pages for future module routes.
- **Tenant settings page:** Tenant admin can configure branding from `/t/settings`.

**Architecture:**
- Navigation items filtered by `moduleKey` against tenant's active entitlements — if a module is not entitled and active, its nav item is hidden
- Sidebar supports custom gradient colors from `tenant_branding.sidebar_gradient_from/to`
- Customer portal is a completely separate shell from the admin/practitioner views

---

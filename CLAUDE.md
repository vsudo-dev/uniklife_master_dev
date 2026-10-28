# UNIKLIFE.AI — Claude Code Project Instructions

## Project
UNIKLIFE.AI: Multi-tenant, multi-industry, white-label SaaS Business Operating System.
First vertical: Weight Loss & Wellness OS (WellnessOS).

## Stack
- Frontend: React + TypeScript + Vite
- Backend: Modular TypeScript services (Cloudflare Workers compatible)
- Database: Supabase PostgreSQL with RLS
- Auth: Supabase Auth
- Storage: Supabase Storage (private buckets for health data)
- Future hosting: Cloudflare Workers with Static Assets

## Rules
- Read `docs/ARCHITECTURE.md` before any structural changes
- Never hard-code tenant IDs, Supabase URLs, or API keys
- All migrations go in `supabase/migrations/` with timestamps
- RLS on every tenant-owned table — no exceptions
- Health data tables get stricter access policies than business data
- No code changes without phase approval from owner
- Run `npm run typecheck && npm run lint` before reporting task complete

## Phase Gate
Current phase: **Phase 0 — Architecture Blueprint**
Do NOT create application code, install packages, or run migrations until Phase 1 is approved.

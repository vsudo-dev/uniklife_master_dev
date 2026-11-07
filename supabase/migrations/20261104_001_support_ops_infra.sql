-- ============================================================================
-- UNIKLIFE.AI — Support Ops Infrastructure
-- Date: 2026-11-04
-- Description: pg_cron grant expiry job + validate_support_grant() RPC helper
-- ============================================================================

-- Enable pg_cron (requires Supabase Extensions to have pg_cron enabled first)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- ============================================================================
-- AUTO-EXPIRE STALE GRANTS
-- Runs every hour. Flips grants from 'active' to 'expired' when expires_at passes.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.expire_stale_grants()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE support_permission_grants
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < now();
$$;

SELECT cron.schedule(
  'expire-support-grants',
  '0 * * * *',
  $$SELECT public.expire_stale_grants()$$
);

-- ============================================================================
-- VALIDATE_SUPPORT_GRANT
-- Called by the support-action Edge Function via RPC.
-- Returns the matching grant row if the caller has a valid, non-expired,
-- correctly-scoped grant for the requested permission + action.
-- Returns zero rows if no valid grant exists.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_support_grant(
  p_grantee_user_id uuid,
  p_permission_key  text,
  p_tenant_id       uuid,
  p_action          text
)
RETURNS TABLE (
  grant_id          uuid,
  requires_approval boolean,
  module_scope_id   uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, requires_approval, module_scope_id
  FROM support_permission_grants
  WHERE grantee_user_id = p_grantee_user_id
    AND permission_key  = p_permission_key
    AND status          = 'active'
    AND expires_at      > now()
    AND (tenant_scope_id IS NULL OR tenant_scope_id = p_tenant_id)
    AND p_action        = ANY(allowed_actions)
  LIMIT 1;
$$;

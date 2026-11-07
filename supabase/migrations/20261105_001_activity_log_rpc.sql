-- Migration: 20261105_001_activity_log_rpc.sql
-- Adds log_user_activity() RPC so the frontend can write activity events
-- (page views, searches, exports) to audit_logs without bypassing RLS.

CREATE OR REPLACE FUNCTION log_user_activity(
  p_action      TEXT,
  p_entity_type TEXT DEFAULT 'page',
  p_entity_id   UUID DEFAULT NULL,
  p_details     JSONB DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id  UUID;
  v_role      TEXT;
  v_tenant_id UUID;
BEGIN
  SELECT id INTO v_actor_id
  FROM platform_users
  WHERE auth_user_id = auth.uid();

  IF v_actor_id IS NULL THEN RETURN; END IF;

  SELECT role, tenant_id INTO v_role, v_tenant_id
  FROM tenant_memberships
  WHERE platform_user_id = v_actor_id
    AND status = 'active'
  ORDER BY created_at
  LIMIT 1;

  INSERT INTO audit_logs (actor_id, actor_role, tenant_id, action, entity_type, entity_id, details)
  VALUES (v_actor_id, COALESCE(v_role, 'super_admin'), v_tenant_id, p_action, p_entity_type, p_entity_id, p_details);
END;
$$;

GRANT EXECUTE ON FUNCTION log_user_activity TO authenticated;

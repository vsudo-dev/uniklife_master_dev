-- Migration: 20261107_001_fix_audit_actor_role.sql
-- Fix: audit trigger never set actor_role — always NULL.
-- 1. Rewrite log_audit_event() to populate actor_role from platform_users.platform_role
-- 2. Backfill existing audit_logs rows that have NULL actor_role

-- ── 1. Fix the trigger function ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id   UUID;
  v_actor_role TEXT;
BEGIN
  v_actor_id := public.platform_user_id();

  SELECT platform_role INTO v_actor_role
  FROM platform_users
  WHERE id = v_actor_id;

  INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, details)
  VALUES (
    v_actor_id,
    v_actor_role,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ── 2. Backfill existing rows ────────────────────────────────────────────────

UPDATE audit_logs al
SET actor_role = pu.platform_role
FROM platform_users pu
WHERE al.actor_id = pu.id
  AND al.actor_role IS NULL;

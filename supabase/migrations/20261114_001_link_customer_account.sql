-- Migration: 20261114_001_link_customer_account.sql
-- Purpose: RPC for self-service customer account linking
-- When a new customer signs up with Supabase Auth, this function:
--   1. Finds their contacts row by email
--   2. Sets contacts.auth_user_id = auth.uid()
--   3. Creates tenant_memberships with role='customer'
-- Called by the frontend after first login with no existing memberships.

CREATE OR REPLACE FUNCTION public.link_customer_account()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_id    UUID;
  v_auth_email TEXT;
  v_platform_id UUID;
  v_contact    RECORD;
BEGIN
  v_auth_id    := auth.uid();
  v_auth_email := auth.email();

  IF v_auth_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Get platform_users.id for this auth user
  SELECT id INTO v_platform_id
  FROM platform_users
  WHERE auth_user_id = v_auth_id
  LIMIT 1;

  IF v_platform_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'platform_user_not_found');
  END IF;

  -- Find unlinked contact with matching email (or already linked to this user)
  SELECT id, tenant_id INTO v_contact
  FROM contacts
  WHERE email = v_auth_email
    AND (auth_user_id IS NULL OR auth_user_id = v_auth_id)
    AND deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_contact.id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'no_contact_found');
  END IF;

  -- Link contact to this Supabase auth user
  UPDATE contacts
  SET auth_user_id = v_auth_id
  WHERE id = v_contact.id;

  -- Create customer membership (idempotent — ignore conflict)
  INSERT INTO tenant_memberships (tenant_id, user_id, role, status)
  VALUES (v_contact.tenant_id, v_platform_id, 'customer', 'active')
  ON CONFLICT (tenant_id, user_id) DO NOTHING;

  RETURN json_build_object(
    'ok',         true,
    'tenant_id',  v_contact.tenant_id,
    'contact_id', v_contact.id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_customer_account() TO authenticated;

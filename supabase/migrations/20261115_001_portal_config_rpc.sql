-- Migration: 20261115_001_portal_config_rpc.sql
-- Purpose: Public RPC for portal login page to load tenant branding without auth.
--          Returns minimal display info (name, logo, colors) for the given tenant slug.
--          Accessible to anon role so unauthenticated users can see tenant branding.

CREATE OR REPLACE FUNCTION public.get_portal_config(p_slug TEXT)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'name',          COALESCE(tb.business_name, t.name),
    'logo_url',      tb.logo_url,
    'gradient_from', tb.sidebar_gradient_from,
    'gradient_to',   tb.sidebar_gradient_to,
    'is_active',     t.status = 'active'
  )
  FROM tenants t
  LEFT JOIN tenant_branding tb ON tb.tenant_id = t.id
  WHERE t.slug = p_slug
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_portal_config(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_portal_config(TEXT) TO authenticated;

-- ============================================================================
-- UNIKLIFE.AI — Allow Super Admin to update platform_users
-- Version: 0.16.2
-- Date: 2026-11-07
-- Description: Super Admin needs to change platform_role when promoting
--              users to support_ops (or reverting). Previously only
--              users_update_own existed (self-update only).
-- ============================================================================

CREATE POLICY "users_update_super" ON platform_users
  FOR UPDATE USING (public.is_super_admin());

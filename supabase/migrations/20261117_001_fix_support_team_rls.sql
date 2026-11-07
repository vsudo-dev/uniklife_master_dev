-- ============================================================================
-- UNIKLIFE.AI — Fix Support Team Members RLS Policies
-- Version: 0.16.1
-- Date: 2026-11-07
-- Description: Replace broken FOR ALL policy with per-operation policies
--              using public.is_super_admin() — matches codebase convention.
-- ============================================================================

-- Drop the broken policies
DROP POLICY IF EXISTS support_team_super_admin_all ON support_team_members;
DROP POLICY IF EXISTS support_team_support_ops_read ON support_team_members;

-- Also drop the fixed names in case the corrected migration was already applied
DROP POLICY IF EXISTS support_team_super_admin_select ON support_team_members;
DROP POLICY IF EXISTS support_team_super_admin_insert ON support_team_members;
DROP POLICY IF EXISTS support_team_super_admin_update ON support_team_members;
DROP POLICY IF EXISTS support_team_super_admin_delete ON support_team_members;

-- Super Admin: full CRUD
CREATE POLICY support_team_super_admin_select
  ON support_team_members
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY support_team_super_admin_insert
  ON support_team_members
  FOR INSERT WITH CHECK (public.is_super_admin());

CREATE POLICY support_team_super_admin_update
  ON support_team_members
  FOR UPDATE USING (public.is_super_admin());

CREATE POLICY support_team_super_admin_delete
  ON support_team_members
  FOR DELETE USING (public.is_super_admin());

-- Support Ops: read-only
CREATE POLICY support_team_support_ops_read
  ON support_team_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE id = public.platform_user_id()
        AND platform_role = 'support_ops'
    )
  );

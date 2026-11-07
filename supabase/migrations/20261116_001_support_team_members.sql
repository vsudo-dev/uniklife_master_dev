-- ============================================================================
-- UNIKLIFE.AI — Support Team Members Table
-- Version: 0.16.0
-- Date: 2026-11-07
-- Description: Support team roster — Super Admin adds members here,
--              then enables delegation grants per member.
-- ============================================================================

CREATE TABLE support_team_members (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  added_by    UUID NOT NULL REFERENCES platform_users(id),
  label       TEXT,
  status      TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'removed')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id)
);

CREATE INDEX idx_support_team_status ON support_team_members(status);

CREATE TRIGGER set_support_team_updated_at
  BEFORE UPDATE ON support_team_members
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE support_team_members ENABLE ROW LEVEL SECURITY;

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

-- Fix: branch_assign_insert must verify branch and membership belong to same tenant
DROP POLICY "branch_assign_insert" ON branch_assignments;

CREATE POLICY "branch_assign_insert" ON branch_assignments
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR (
      membership_id IN (
        SELECT id FROM tenant_memberships
        WHERE public.tenant_role(tenant_id) = 'tenant_admin'
      )
      AND branch_id IN (
        SELECT b.id FROM branches b
        JOIN tenant_memberships tm ON tm.tenant_id = b.tenant_id
        WHERE tm.id = membership_id
      )
    )
  );

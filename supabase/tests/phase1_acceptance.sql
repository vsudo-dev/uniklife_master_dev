-- ============================================================================
-- UNIKLIFE.AI — Phase 1 Acceptance Tests (23 scenarios)
-- Run: npx supabase db query --linked --file supabase/tests/phase1_acceptance.sql
-- ============================================================================

BEGIN;

-- Results table (temporary, rolled back)
CREATE TEMP TABLE test_results (
  test_id   text,
  test_name text,
  passed    boolean
);
GRANT ALL ON test_results TO authenticated, anon;

DO $$
DECLARE
  v_super_auth_id    uuid := '00000000-0000-0000-0000-000000000001';
  v_admin_a_auth_id  uuid := '00000000-0000-0000-0000-000000000002';
  v_pract_a_auth_id  uuid := '00000000-0000-0000-0000-000000000003';
  v_staff_a_auth_id  uuid := '00000000-0000-0000-0000-000000000004';
  v_cust_a_auth_id   uuid := '00000000-0000-0000-0000-000000000005';
  v_admin_b_auth_id  uuid := '00000000-0000-0000-0000-000000000006';
  v_support_auth_id  uuid := '00000000-0000-0000-0000-000000000007';
  v_cust_a2_auth_id  uuid := '00000000-0000-0000-0000-000000000008';

  v_super_id uuid; v_admin_a_id uuid; v_pract_a_id uuid; v_staff_a_id uuid;
  v_cust_a_id uuid; v_admin_b_id uuid; v_support_id uuid; v_cust_a2_id uuid;

  v_tenant_a_id uuid; v_tenant_b_id uuid;
  v_branch_a1_id uuid; v_branch_a2_id uuid; v_branch_b1_id uuid;

  v_mem_admin_a uuid; v_mem_pract_a uuid; v_mem_staff_a uuid;
  v_mem_cust_a uuid; v_mem_admin_b uuid; v_mem_cust_a2 uuid;

  v_assign_pract_a1 uuid;
  v_grant_id uuid; v_grant2_id uuid;

  v_count int;
  v_pass boolean;
BEGIN
  -- ========== FIXTURES ==========

  INSERT INTO platform_users (auth_user_id, email, full_name, platform_role, status)
  VALUES (v_super_auth_id, 'test-super@test.com', 'Test Super', 'super_admin', 'active')
  RETURNING id INTO v_super_id;

  INSERT INTO platform_users (auth_user_id, email, full_name, platform_role, status)
  VALUES (v_admin_a_auth_id, 'test-admin-a@test.com', 'Admin A', 'tenant_user', 'active')
  RETURNING id INTO v_admin_a_id;

  INSERT INTO platform_users (auth_user_id, email, full_name, platform_role, status)
  VALUES (v_pract_a_auth_id, 'test-pract-a@test.com', 'Practitioner A', 'tenant_user', 'active')
  RETURNING id INTO v_pract_a_id;

  INSERT INTO platform_users (auth_user_id, email, full_name, platform_role, status)
  VALUES (v_staff_a_auth_id, 'test-staff-a@test.com', 'Staff A', 'tenant_user', 'active')
  RETURNING id INTO v_staff_a_id;

  INSERT INTO platform_users (auth_user_id, email, full_name, platform_role, status)
  VALUES (v_cust_a_auth_id, 'test-cust-a@test.com', 'Customer A', 'tenant_user', 'active')
  RETURNING id INTO v_cust_a_id;

  INSERT INTO platform_users (auth_user_id, email, full_name, platform_role, status)
  VALUES (v_admin_b_auth_id, 'test-admin-b@test.com', 'Admin B', 'tenant_user', 'active')
  RETURNING id INTO v_admin_b_id;

  INSERT INTO platform_users (auth_user_id, email, full_name, platform_role, status)
  VALUES (v_support_auth_id, 'test-support@test.com', 'Support Ops', 'support_ops', 'active')
  RETURNING id INTO v_support_id;

  INSERT INTO platform_users (auth_user_id, email, full_name, platform_role, status)
  VALUES (v_cust_a2_auth_id, 'test-cust-a2@test.com', 'Customer A2', 'tenant_user', 'active')
  RETURNING id INTO v_cust_a2_id;

  INSERT INTO tenants (name, slug, status, subscription_tier, created_by)
  VALUES ('Tenant A', 'test-tenant-a', 'active', 'professional', v_super_id)
  RETURNING id INTO v_tenant_a_id;

  INSERT INTO tenants (name, slug, status, subscription_tier, created_by)
  VALUES ('Tenant B', 'test-tenant-b', 'active', 'starter', v_super_id)
  RETURNING id INTO v_tenant_b_id;

  INSERT INTO branches (tenant_id, name, country, timezone, is_primary, created_by)
  VALUES (v_tenant_a_id, 'Branch A1', 'IN', 'Asia/Kolkata', true, v_super_id)
  RETURNING id INTO v_branch_a1_id;

  INSERT INTO branches (tenant_id, name, country, timezone, is_primary, created_by)
  VALUES (v_tenant_a_id, 'Branch A2', 'IN', 'Asia/Kolkata', false, v_super_id)
  RETURNING id INTO v_branch_a2_id;

  INSERT INTO branches (tenant_id, name, country, timezone, is_primary, created_by)
  VALUES (v_tenant_b_id, 'Branch B1', 'IN', 'Asia/Kolkata', true, v_super_id)
  RETURNING id INTO v_branch_b1_id;

  INSERT INTO tenant_memberships (tenant_id, user_id, role, status, joined_at)
  VALUES (v_tenant_a_id, v_admin_a_id, 'tenant_admin', 'active', now())
  RETURNING id INTO v_mem_admin_a;

  INSERT INTO tenant_memberships (tenant_id, user_id, role, status, joined_at)
  VALUES (v_tenant_a_id, v_pract_a_id, 'practitioner', 'active', now())
  RETURNING id INTO v_mem_pract_a;

  INSERT INTO tenant_memberships (tenant_id, user_id, role, status, joined_at)
  VALUES (v_tenant_a_id, v_staff_a_id, 'staff', 'active', now())
  RETURNING id INTO v_mem_staff_a;

  INSERT INTO tenant_memberships (tenant_id, user_id, role, status, joined_at)
  VALUES (v_tenant_a_id, v_cust_a_id, 'customer', 'active', now())
  RETURNING id INTO v_mem_cust_a;

  INSERT INTO tenant_memberships (tenant_id, user_id, role, status, joined_at)
  VALUES (v_tenant_a_id, v_cust_a2_id, 'customer', 'active', now())
  RETURNING id INTO v_mem_cust_a2;

  INSERT INTO tenant_memberships (tenant_id, user_id, role, status, joined_at)
  VALUES (v_tenant_b_id, v_admin_b_id, 'tenant_admin', 'active', now())
  RETURNING id INTO v_mem_admin_b;

  INSERT INTO branch_assignments (membership_id, branch_id, assigned_by)
  VALUES (v_mem_pract_a, v_branch_a1_id, v_super_id)
  RETURNING id INTO v_assign_pract_a1;

  INSERT INTO branch_assignments (membership_id, branch_id, assigned_by)
  VALUES (v_mem_staff_a, v_branch_a1_id, v_super_id);

  INSERT INTO health_data_access_log (user_id, tenant_id, record_type, record_id, access_reason)
  VALUES (v_pract_a_id, v_tenant_a_id, 'assessment', gen_random_uuid(), 'test entry');

  -- ========== P1: Super Admin sees all tenants ==========
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_super_auth_id::text)::text, true);
  SELECT count(*) INTO v_count FROM tenants;
  INSERT INTO test_results VALUES ('P1', 'Super Admin sees all tenants', v_count >= 2);
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  -- ========== P2: Tenant Admin sees own tenant ==========
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_a_auth_id::text)::text, true);
  SELECT count(*) INTO v_count FROM tenants WHERE id = v_tenant_a_id;
  INSERT INTO test_results VALUES ('P2', 'Tenant Admin sees own tenant', v_count = 1);
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  -- ========== P3: Practitioner sees own tenant branches ==========
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_pract_a_auth_id::text)::text, true);
  SELECT count(*) INTO v_count FROM branches WHERE tenant_id = v_tenant_a_id;
  INSERT INTO test_results VALUES ('P3', 'Practitioner sees own tenant branches', v_count = 2);
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  -- ========== P4: Customer sees own membership ==========
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_cust_a_auth_id::text)::text, true);
  SELECT count(*) INTO v_count FROM tenant_memberships WHERE user_id = v_cust_a_id;
  INSERT INTO test_results VALUES ('P4', 'Customer sees own membership', v_count = 1);
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  -- ========== P5: Delegation grant lifecycle ==========
  INSERT INTO support_permission_grants (
    grantee_user_id, granted_by_user_id, permission_key,
    tenant_scope_id, allowed_actions, requires_approval,
    effective_at, expires_at, reason, status
  ) VALUES (
    v_support_id, v_super_id, 'tenant.manage',
    v_tenant_a_id, ARRAY['read','update'], true,
    now(), now() + interval '24 hours', 'Test grant', 'active'
  ) RETURNING id INTO v_grant_id;
  INSERT INTO test_results VALUES ('P5', 'Delegation grant created', v_grant_id IS NOT NULL);

  -- ========== P6: Audit log captures operations ==========
  SELECT count(*) INTO v_count FROM audit_logs WHERE entity_type = 'tenants';
  INSERT INTO test_results VALUES ('P6', 'Audit log has tenant entries', v_count >= 2);

  -- ========== N7: Tenant A admin cannot see Tenant B ==========
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_a_auth_id::text)::text, true);
  SELECT count(*) INTO v_count FROM tenants WHERE id = v_tenant_b_id;
  INSERT INTO test_results VALUES ('N7', 'Tenant A admin cannot see Tenant B', v_count = 0);
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  -- ========== N8: Tenant A cannot INSERT into Tenant B ==========
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_a_auth_id::text)::text, true);
  BEGIN
    INSERT INTO branches (tenant_id, name, country, timezone, is_primary)
    VALUES (v_tenant_b_id, 'Rogue Branch', 'IN', 'Asia/Kolkata', false);
    v_pass := false;
  EXCEPTION WHEN OTHERS THEN
    v_pass := true;
  END;
  INSERT INTO test_results VALUES ('N8', 'Tenant A cannot insert branch in Tenant B', v_pass);
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  -- ========== N9: Cross-tenant branch assignment denied ==========
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_a_auth_id::text)::text, true);
  BEGIN
    INSERT INTO branch_assignments (membership_id, branch_id, assigned_by)
    VALUES (v_mem_admin_a, v_branch_b1_id, v_admin_a_id);
    v_pass := false;
  EXCEPTION WHEN OTHERS THEN
    v_pass := true;
  END;
  INSERT INTO test_results VALUES ('N9', 'Cross-tenant branch assignment denied', v_pass);
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  -- ========== N10: Tenant A cannot see Tenant B branches ==========
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_a_auth_id::text)::text, true);
  SELECT count(*) INTO v_count FROM branches WHERE tenant_id = v_tenant_b_id;
  INSERT INTO test_results VALUES ('N10', 'Tenant A sees 0 Tenant B branches', v_count = 0);
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  -- ========== N11: Cross-tenant membership insert denied ==========
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_a_auth_id::text)::text, true);
  BEGIN
    INSERT INTO tenant_memberships (tenant_id, user_id, role, status)
    VALUES (v_tenant_b_id, v_cust_a_id, 'customer', 'active');
    v_pass := false;
  EXCEPTION WHEN OTHERS THEN
    v_pass := true;
  END;
  INSERT INTO test_results VALUES ('N11', 'Cross-tenant membership insert denied', v_pass);
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  -- ========== N12: Branch X user no access to Branch Y ==========
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_pract_a_auth_id::text)::text, true);
  SELECT CASE WHEN public.has_branch_access(v_tenant_a_id, v_branch_a2_id) THEN 0 ELSE 1 END INTO v_count;
  INSERT INTO test_results VALUES ('N12', 'Practitioner A no access to Branch A2', v_count = 1);
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  -- ========== N13: Removing assignment denies access ==========
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_pract_a_auth_id::text)::text, true);
  SELECT CASE WHEN public.has_branch_access(v_tenant_a_id, v_branch_a1_id) THEN 1 ELSE 0 END INTO v_count;
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  IF v_count = 1 THEN
    UPDATE branch_assignments SET removed_at = now() WHERE id = v_assign_pract_a1;

    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_pract_a_auth_id::text)::text, true);
    SELECT CASE WHEN public.has_branch_access(v_tenant_a_id, v_branch_a1_id) THEN 1 ELSE 0 END INTO v_count;
    INSERT INTO test_results VALUES ('N13', 'Removed assignment denies access', v_count = 0);
    PERFORM set_config('role', 'postgres', true);
    PERFORM set_config('request.jwt.claims', '', true);

    UPDATE branch_assignments SET removed_at = NULL WHERE id = v_assign_pract_a1;
  ELSE
    INSERT INTO test_results VALUES ('N13', 'Removed assignment denies access', false);
  END IF;

  -- ========== N14: Anon gets 0 health rows ==========
  PERFORM set_config('role', 'anon', true);
  PERFORM set_config('request.jwt.claims', '', true);
  SELECT count(*) INTO v_count FROM health_data_access_log;
  INSERT INTO test_results VALUES ('N14', 'Anon gets 0 health log rows', v_count = 0);
  PERFORM set_config('role', 'postgres', true);

  -- ========== N15: Customer gets 0 health rows ==========
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_cust_a_auth_id::text)::text, true);
  SELECT count(*) INTO v_count FROM health_data_access_log;
  INSERT INTO test_results VALUES ('N15', 'Customer gets 0 health log rows', v_count = 0);
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  -- ========== N16: Staff gets 0 health rows ==========
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_staff_a_auth_id::text)::text, true);
  SELECT count(*) INTO v_count FROM health_data_access_log;
  INSERT INTO test_results VALUES ('N16', 'Staff gets 0 health log rows', v_count = 0);
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  -- ========== N17: Tenant Admin sees health log for own tenant ==========
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_a_auth_id::text)::text, true);
  SELECT count(*) INTO v_count FROM health_data_access_log WHERE tenant_id = v_tenant_a_id;
  INSERT INTO test_results VALUES ('N17', 'Tenant Admin sees own tenant health log', v_count >= 1);
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  -- ========== N18: Customer cannot update another customer ==========
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_cust_a_auth_id::text)::text, true);
  BEGIN
    UPDATE tenant_memberships SET role = 'tenant_admin' WHERE id = v_mem_cust_a2;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_pass := (v_count = 0);
  EXCEPTION WHEN OTHERS THEN
    v_pass := true;
  END;
  INSERT INTO test_results VALUES ('N18', 'Customer cannot update other customer', v_pass);
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  -- ========== N19: Customer cannot self-escalate ==========
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_cust_a_auth_id::text)::text, true);
  BEGIN
    UPDATE tenant_memberships SET role = 'tenant_admin' WHERE id = v_mem_cust_a;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_pass := (v_count = 0);
  EXCEPTION WHEN OTHERS THEN
    v_pass := true;
  END;
  INSERT INTO test_results VALUES ('N19', 'Customer cannot escalate to tenant_admin', v_pass);
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  -- ========== N20: Self-grant CHECK constraint ==========
  BEGIN
    INSERT INTO support_permission_grants (
      grantee_user_id, granted_by_user_id, permission_key,
      allowed_actions, requires_approval, effective_at, expires_at, reason
    ) VALUES (
      v_support_id, v_support_id, 'tenant.manage',
      ARRAY['read'], true, now(), now() + interval '1 hour', 'self-grant'
    );
    v_pass := false;
  EXCEPTION WHEN check_violation THEN
    v_pass := true;
  END;
  INSERT INTO test_results VALUES ('N20', 'Self-grant CHECK denied', v_pass);

  -- ========== N21: Self-approve CHECK constraint ==========
  DECLARE
    v_req_id uuid;
  BEGIN
    INSERT INTO support_action_requests (
      requester_id, grant_id, tenant_id, requested_action, request_reason, expires_at
    ) VALUES (
      v_support_id, v_grant_id, v_tenant_a_id, 'update_billing', 'Test', now() + interval '4 hours'
    ) RETURNING id INTO v_req_id;

    BEGIN
      UPDATE support_action_requests
      SET status = 'approved', reviewer_id = v_support_id, reviewed_at = now()
      WHERE id = v_req_id;
      v_pass := false;
    EXCEPTION WHEN check_violation THEN
      v_pass := true;
    END;
  END;
  INSERT INTO test_results VALUES ('N21', 'Self-approve CHECK denied', v_pass);

  -- ========== N22: Non-super cannot create delegation grant ==========
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_a_auth_id::text)::text, true);
  BEGIN
    INSERT INTO support_permission_grants (
      grantee_user_id, granted_by_user_id, permission_key,
      allowed_actions, requires_approval, effective_at, expires_at, reason
    ) VALUES (
      v_support_id, v_admin_a_id, 'tenant.manage',
      ARRAY['read'], true, now(), now() + interval '1 hour', 'tenant admin attempt'
    );
    v_pass := false;
  EXCEPTION WHEN OTHERS THEN
    v_pass := true;
  END;
  INSERT INTO test_results VALUES ('N22', 'Non-super cannot create delegation', v_pass);
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);

  -- ========== N23a: Past expires_at rejected ==========
  BEGIN
    INSERT INTO support_permission_grants (
      grantee_user_id, granted_by_user_id, permission_key,
      allowed_actions, requires_approval, effective_at, expires_at, reason
    ) VALUES (
      v_support_id, v_super_id, 'tenant.billing',
      ARRAY['read'], true, now(), now() - interval '1 hour', 'past expiry'
    );
    v_pass := false;
  EXCEPTION WHEN check_violation THEN
    v_pass := true;
  END;
  INSERT INTO test_results VALUES ('N23a', 'Past expires_at rejected', v_pass);

  -- ========== N23b: Grantee=grantor rejected ==========
  BEGIN
    INSERT INTO support_permission_grants (
      grantee_user_id, granted_by_user_id, permission_key,
      allowed_actions, requires_approval, effective_at, expires_at, reason
    ) VALUES (
      v_super_id, v_super_id, 'tenant.manage',
      ARRAY['read'], true, now(), now() + interval '1 hour', 'self-grant test'
    );
    v_pass := false;
  EXCEPTION WHEN check_violation THEN
    v_pass := true;
  END;
  INSERT INTO test_results VALUES ('N23b', 'Grantee=grantor rejected', v_pass);

  -- ========== N25: Revoked grant not active ==========
  INSERT INTO support_permission_grants (
    grantee_user_id, granted_by_user_id, permission_key,
    allowed_actions, requires_approval, effective_at, expires_at, reason, status
  ) VALUES (
    v_support_id, v_super_id, 'tenant.billing',
    ARRAY['read'], true, now(), now() + interval '48 hours', 'revoke test', 'active'
  ) RETURNING id INTO v_grant2_id;

  UPDATE support_permission_grants
  SET status = 'revoked', revoked_at = now(), revoked_by = v_super_id, revoked_reason = 'test'
  WHERE id = v_grant2_id;

  SELECT count(*) INTO v_count FROM support_permission_grants
  WHERE id = v_grant2_id AND status = 'active';
  INSERT INTO test_results VALUES ('N25', 'Revoked grant not active', v_count = 0);

END $$;

-- Summary + any failures
SELECT
  (SELECT count(*) FROM test_results WHERE passed) AS passed,
  (SELECT count(*) FROM test_results WHERE NOT passed) AS failed,
  (SELECT count(*) FROM test_results) AS total,
  (SELECT string_agg(test_id || ': ' || test_name, ', ') FROM test_results WHERE NOT passed) AS failures;

ROLLBACK;

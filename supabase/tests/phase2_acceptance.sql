-- Phase 2 Acceptance Tests: Module Engine
-- Exit criteria: Module enable/disable works with dependency checks;
--               revoked entitlement denies access server-side.
-- Run with: supabase db query --linked < supabase/tests/phase2_acceptance.sql

BEGIN;

-- ============================================================
-- Test infrastructure
-- ============================================================
CREATE TEMP TABLE test_results (
  test_id   TEXT PRIMARY KEY,
  passed    BOOLEAN NOT NULL,
  detail    TEXT
);
GRANT ALL ON test_results TO authenticated, anon;

-- ============================================================
-- Helper: impersonate a user
-- ============================================================
CREATE OR REPLACE FUNCTION pg_temp.impersonate(p_auth_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_auth_id)::text, true);
END;
$$;

-- Reset to postgres role
CREATE OR REPLACE FUNCTION pg_temp.reset_role()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);
END;
$$;

-- ============================================================
-- Setup: create test users
-- ============================================================
-- Super Admin (use unique UUIDs and emails for test isolation)
INSERT INTO auth.users (id, email, role, instance_id, aud, created_at, updated_at, confirmation_sent_at, raw_app_meta_data, raw_user_meta_data, is_super_admin)
VALUES ('a2000000-0000-0000-0000-000000000001', 'sa-p2-test@test.uniklife.ai', 'authenticated', '00000000-0000-0000-0000-000000000000', 'authenticated', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"SA P2 Test"}', false);

-- Manually set super_admin role (auto-promote trigger only fires for specific email)
UPDATE platform_users SET platform_role = 'super_admin' WHERE auth_user_id = 'a2000000-0000-0000-0000-000000000001';

-- Tenant Admin
INSERT INTO auth.users (id, email, role, instance_id, aud, created_at, updated_at, confirmation_sent_at, raw_app_meta_data, raw_user_meta_data, is_super_admin)
VALUES ('a2000000-0000-0000-0000-000000000002', 'tadmin-p2-test@test.uniklife.ai', 'authenticated', '00000000-0000-0000-0000-000000000000', 'authenticated', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Tenant Admin P2"}', false);

-- Regular user
INSERT INTO auth.users (id, email, role, instance_id, aud, created_at, updated_at, confirmation_sent_at, raw_app_meta_data, raw_user_meta_data, is_super_admin)
VALUES ('a2000000-0000-0000-0000-000000000003', 'user-p2-test@test.uniklife.ai', 'authenticated', '00000000-0000-0000-0000-000000000000', 'authenticated', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Regular User P2"}', false);

-- Wait for triggers to create platform_users
DO $$ BEGIN PERFORM pg_sleep(0.2); END $$;

-- Get platform_user IDs
DO $$
DECLARE
  v_sa_id  UUID;
  v_ta_id  UUID;
  v_ru_id  UUID;
  v_tenant_id UUID;
  v_ta_membership_id UUID;
  v_ru_membership_id UUID;
  v_p01_id UUID;
  v_p02_id UUID;
  v_p04_id UUID;
  v_p06_id UUID;
  v_c01_id UUID;
  v_w01_id UUID;
  v_ent_p01 UUID;
  v_ent_p02 UUID;
  v_ent_c01 UUID;
  v_ent_w01 UUID;
  v_result RECORD;
  v_count  INT;
BEGIN
  SELECT id INTO v_sa_id FROM platform_users WHERE email = 'sa-p2-test@test.uniklife.ai';
  SELECT id INTO v_ta_id FROM platform_users WHERE email = 'tadmin-p2-test@test.uniklife.ai';
  SELECT id INTO v_ru_id FROM platform_users WHERE email = 'user-p2-test@test.uniklife.ai';

  -- ============================================================
  -- T1: Industry profiles are seeded and readable
  -- ============================================================
  PERFORM pg_temp.impersonate('a2000000-0000-0000-0000-000000000001');
  SELECT count(*) INTO v_count FROM industry_profiles;
  INSERT INTO test_results VALUES ('T1', v_count >= 5,
    'Industry profiles count: ' || v_count);
  PERFORM pg_temp.reset_role();

  -- ============================================================
  -- T2: All 56 modules are seeded
  -- ============================================================
  PERFORM pg_temp.impersonate('a2000000-0000-0000-0000-000000000001');
  SELECT count(*) INTO v_count FROM global_modules;
  INSERT INTO test_results VALUES ('T2', v_count = 56,
    'Module count: ' || v_count);
  PERFORM pg_temp.reset_role();

  -- ============================================================
  -- T3: Module layers are distributed correctly
  -- ============================================================
  PERFORM pg_temp.impersonate('a2000000-0000-0000-0000-000000000001');
  SELECT count(*) INTO v_count FROM global_modules WHERE layer = 'platform';
  INSERT INTO test_results VALUES ('T3a', v_count = 11, 'Platform modules: ' || v_count);
  SELECT count(*) INTO v_count FROM global_modules WHERE layer = 'core';
  INSERT INTO test_results VALUES ('T3b', v_count = 11, 'Core modules: ' || v_count);
  SELECT count(*) INTO v_count FROM global_modules WHERE layer = 'vertical';
  INSERT INTO test_results VALUES ('T3c', v_count = 24, 'Vertical modules: ' || v_count);
  SELECT count(*) INTO v_count FROM global_modules WHERE layer = 'addon';
  INSERT INTO test_results VALUES ('T3d', v_count = 10, 'Addon modules: ' || v_count);
  PERFORM pg_temp.reset_role();

  -- ============================================================
  -- Setup: create test tenant + memberships
  -- ============================================================
  INSERT INTO tenants (id, name, slug, status, subscription_tier, created_by)
  VALUES ('b2000000-0000-0000-0000-000000000001', 'P2 Test Clinic', 'p2-test', 'active', 'professional', v_sa_id)
  RETURNING id INTO v_tenant_id;

  INSERT INTO tenant_memberships (id, tenant_id, user_id, role, status, invited_by)
  VALUES ('c2000000-0000-0000-0000-000000000001', v_tenant_id, v_ta_id, 'tenant_admin', 'active', v_sa_id)
  RETURNING id INTO v_ta_membership_id;

  INSERT INTO tenant_memberships (id, tenant_id, user_id, role, status, invited_by)
  VALUES ('c2000000-0000-0000-0000-000000000002', v_tenant_id, v_ru_id, 'practitioner', 'active', v_sa_id)
  RETURNING id INTO v_ru_membership_id;

  -- Get module IDs
  SELECT id INTO v_p01_id FROM global_modules WHERE key = 'P01';
  SELECT id INTO v_p02_id FROM global_modules WHERE key = 'P02';
  SELECT id INTO v_p04_id FROM global_modules WHERE key = 'P04';
  SELECT id INTO v_p06_id FROM global_modules WHERE key = 'P06';
  SELECT id INTO v_c01_id FROM global_modules WHERE key = 'C01';
  SELECT id INTO v_w01_id FROM global_modules WHERE key = 'W01';

  -- ============================================================
  -- T4: Super Admin can assign module (creates PENDING entitlement)
  -- ============================================================
  PERFORM pg_temp.impersonate('a2000000-0000-0000-0000-000000000001');
  INSERT INTO tenant_entitlements (id, tenant_id, module_id, assigned_by, status)
  VALUES ('d2000000-0000-0000-0000-000000000001', v_tenant_id, v_p01_id, v_sa_id, 'pending')
  RETURNING id INTO v_ent_p01;
  INSERT INTO test_results VALUES ('T4', v_ent_p01 IS NOT NULL, 'P01 assigned as pending');
  PERFORM pg_temp.reset_role();

  -- ============================================================
  -- T5: transition_entitlement: PENDING → ACTIVE works
  -- ============================================================
  BEGIN
    SELECT * INTO v_result FROM public.transition_entitlement(v_ent_p01, 'active', v_sa_id, 'Activating P01');
    INSERT INTO test_results VALUES ('T5', v_result.status = 'active', 'P01 transitioned to active');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('T5', false, 'Error: ' || SQLERRM);
  END;

  -- ============================================================
  -- T6: tenant_has_module returns true for active module
  -- ============================================================
  INSERT INTO test_results VALUES ('T6',
    public.tenant_has_module(v_tenant_id, 'P01') = true,
    'tenant_has_module P01 = true');

  -- ============================================================
  -- T7: tenant_has_module returns false for unassigned module
  -- ============================================================
  INSERT INTO test_results VALUES ('T7',
    public.tenant_has_module(v_tenant_id, 'C01') = false,
    'tenant_has_module C01 = false (not assigned)');

  -- ============================================================
  -- T8: Assign P02 (depends on P01 required) — should succeed because P01 is active
  -- ============================================================
  INSERT INTO tenant_entitlements (id, tenant_id, module_id, assigned_by, status)
  VALUES ('d2000000-0000-0000-0000-000000000002', v_tenant_id, v_p02_id, v_sa_id, 'pending')
  RETURNING id INTO v_ent_p02;
  BEGIN
    SELECT * INTO v_result FROM public.transition_entitlement(v_ent_p02, 'active', v_sa_id, 'Activating P02');
    INSERT INTO test_results VALUES ('T8', v_result.status = 'active', 'P02 activated (P01 dependency met)');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('T8', false, 'Error: ' || SQLERRM);
  END;

  -- ============================================================
  -- T9: Activate C01 without P04 (required dep) — should FAIL
  -- ============================================================
  INSERT INTO tenant_entitlements (id, tenant_id, module_id, assigned_by, status)
  VALUES ('d2000000-0000-0000-0000-000000000003', v_tenant_id, v_c01_id, v_sa_id, 'pending')
  RETURNING id INTO v_ent_c01;
  BEGIN
    SELECT * INTO v_result FROM public.transition_entitlement(v_ent_c01, 'active', v_sa_id, 'Trying C01');
    INSERT INTO test_results VALUES ('T9', false, 'Should have failed — C01 needs P04');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('T9',
      SQLERRM LIKE '%missing required dependencies%',
      'Correctly blocked: ' || SQLERRM);
  END;

  -- ============================================================
  -- T10: Disable P01 while P02 depends on it — should FAIL
  -- ============================================================
  BEGIN
    SELECT * INTO v_result FROM public.transition_entitlement(v_ent_p01, 'disabled', v_sa_id, 'Trying disable P01');
    INSERT INTO test_results VALUES ('T10', false, 'Should have failed — P02 depends on P01');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('T10',
      SQLERRM LIKE '%other active modules depend%',
      'Correctly blocked: ' || SQLERRM);
  END;

  -- ============================================================
  -- T11: Suspend P01 (temporary) — should work (suspend doesn't check dependents)
  -- ============================================================
  BEGIN
    SELECT * INTO v_result FROM public.transition_entitlement(v_ent_p01, 'suspended', v_sa_id, 'Suspending P01');
    INSERT INTO test_results VALUES ('T11', v_result.status = 'suspended', 'P01 suspended');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('T11', false, 'Error: ' || SQLERRM);
  END;

  -- ============================================================
  -- T12: tenant_has_module returns false for suspended module
  -- ============================================================
  INSERT INTO test_results VALUES ('T12',
    public.tenant_has_module(v_tenant_id, 'P01') = false,
    'Suspended module not active: tenant_has_module P01 = false');

  -- ============================================================
  -- T13: Reactivate P01 from suspended — should work
  -- ============================================================
  BEGIN
    SELECT * INTO v_result FROM public.transition_entitlement(v_ent_p01, 'active', v_sa_id, 'Reactivating');
    INSERT INTO test_results VALUES ('T13', v_result.status = 'active', 'P01 reactivated from suspended');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('T13', false, 'Error: ' || SQLERRM);
  END;

  -- ============================================================
  -- T14: Invalid transition (active → expired) should FAIL
  -- ============================================================
  BEGIN
    SELECT * INTO v_result FROM public.transition_entitlement(v_ent_p01, 'expired', v_sa_id, 'Bad transition');
    INSERT INTO test_results VALUES ('T14', false, 'Should have rejected invalid transition');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('T14',
      SQLERRM LIKE '%Invalid transition%',
      'Correctly blocked: ' || SQLERRM);
  END;

  -- ============================================================
  -- T15: Tenant admin cannot insert entitlements (RLS)
  -- ============================================================
  PERFORM pg_temp.impersonate('a2000000-0000-0000-0000-000000000002');
  BEGIN
    INSERT INTO tenant_entitlements (tenant_id, module_id, assigned_by, status)
    VALUES (v_tenant_id, v_p06_id, v_ta_id, 'pending');
    INSERT INTO test_results VALUES ('T15', false, 'Tenant admin should not insert entitlements');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('T15', true, 'RLS blocked tenant_admin from inserting entitlement');
  END;
  PERFORM pg_temp.reset_role();

  -- ============================================================
  -- T16: Tenant admin CAN read entitlements for their tenant
  -- ============================================================
  PERFORM pg_temp.impersonate('a2000000-0000-0000-0000-000000000002');
  SELECT count(*) INTO v_count FROM tenant_entitlements WHERE tenant_id = v_tenant_id;
  INSERT INTO test_results VALUES ('T16', v_count > 0,
    'Tenant admin can read entitlements: ' || v_count);
  PERFORM pg_temp.reset_role();

  -- ============================================================
  -- T17: Regular user CAN read entitlements for their tenant
  -- ============================================================
  PERFORM pg_temp.impersonate('a2000000-0000-0000-0000-000000000003');
  SELECT count(*) INTO v_count FROM tenant_entitlements WHERE tenant_id = v_tenant_id;
  INSERT INTO test_results VALUES ('T17', v_count > 0,
    'Practitioner can read entitlements: ' || v_count);
  PERFORM pg_temp.reset_role();

  -- ============================================================
  -- T18: Modules are readable by all authenticated users
  -- ============================================================
  PERFORM pg_temp.impersonate('a2000000-0000-0000-0000-000000000003');
  SELECT count(*) INTO v_count FROM global_modules;
  INSERT INTO test_results VALUES ('T18', v_count = 56,
    'Regular user sees all modules: ' || v_count);
  PERFORM pg_temp.reset_role();

  -- ============================================================
  -- T19: Non-super-admin cannot modify global_modules
  -- ============================================================
  PERFORM pg_temp.impersonate('a2000000-0000-0000-0000-000000000002');
  BEGIN
    UPDATE global_modules SET display_name = 'Hacked' WHERE key = 'P01';
    SELECT count(*) INTO v_count FROM global_modules WHERE display_name = 'Hacked';
    INSERT INTO test_results VALUES ('T19', v_count = 0, 'RLS blocked update (0 rows affected)');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('T19', true, 'RLS blocked module update');
  END;
  PERFORM pg_temp.reset_role();

  -- ============================================================
  -- T20: Industry profiles readable by all, writable only by super_admin
  -- ============================================================
  PERFORM pg_temp.impersonate('a2000000-0000-0000-0000-000000000003');
  SELECT count(*) INTO v_count FROM industry_profiles;
  INSERT INTO test_results VALUES ('T20a', v_count >= 5, 'Regular user reads industries: ' || v_count);
  BEGIN
    INSERT INTO industry_profiles (key, name) VALUES ('TEST_HACK', 'Hack');
    INSERT INTO test_results VALUES ('T20b', false, 'Should have blocked insert');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('T20b', true, 'RLS blocked non-admin industry insert');
  END;
  PERFORM pg_temp.reset_role();

  -- ============================================================
  -- T21: Tag definitions — tenant admin can create tenant-scoped tags
  -- ============================================================
  PERFORM pg_temp.impersonate('a2000000-0000-0000-0000-000000000002');
  BEGIN
    INSERT INTO tag_definitions (namespace, name, owner_type, owner_id, allowed_entity_types, created_by)
    VALUES ('tenant', 'VIP Client', 'tenant', v_tenant_id, ARRAY['contact'], v_ta_id);
    INSERT INTO test_results VALUES ('T21', true, 'Tenant admin created tenant tag');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('T21', false, 'Error: ' || SQLERRM);
  END;
  PERFORM pg_temp.reset_role();

  -- ============================================================
  -- T22: Tag definitions — tenant admin cannot create platform tags
  -- ============================================================
  PERFORM pg_temp.impersonate('a2000000-0000-0000-0000-000000000002');
  BEGIN
    INSERT INTO tag_definitions (namespace, name, owner_type, created_by)
    VALUES ('platform', 'Global Tag', 'platform', v_ta_id);
    INSERT INTO test_results VALUES ('T22', false, 'Should have blocked platform tag by tenant admin');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('T22', true, 'RLS blocked tenant admin from platform tags');
  END;
  PERFORM pg_temp.reset_role();

  -- ============================================================
  -- T23: Vocabulary — tenant admin can create custom vocabulary
  -- ============================================================
  PERFORM pg_temp.impersonate('a2000000-0000-0000-0000-000000000002');
  BEGIN
    INSERT INTO tenant_vocabulary (tenant_id, term_key, default_label, custom_label, updated_by)
    VALUES (v_tenant_id, 'patient', 'Patient', 'Client', v_ta_id);
    INSERT INTO test_results VALUES ('T23', true, 'Tenant admin set custom vocabulary');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('T23', false, 'Error: ' || SQLERRM);
  END;
  PERFORM pg_temp.reset_role();

  -- ============================================================
  -- T24: Feature settings — tenant admin can toggle features for their tenant
  -- ============================================================
  PERFORM pg_temp.impersonate('a2000000-0000-0000-0000-000000000002');
  BEGIN
    INSERT INTO tenant_feature_settings (tenant_id, module_id, feature_key, enabled, updated_by)
    VALUES (v_tenant_id, v_p01_id, 'mfa_required', true, v_ta_id);
    INSERT INTO test_results VALUES ('T24', true, 'Tenant admin toggled feature flag');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO test_results VALUES ('T24', false, 'Error: ' || SQLERRM);
  END;
  PERFORM pg_temp.reset_role();

  -- ============================================================
  -- T25: Audit log captures entitlement transitions
  -- ============================================================
  SELECT count(*) INTO v_count FROM audit_logs
  WHERE entity_type = 'tenant_entitlements' AND action LIKE 'ENTITLEMENT_%';
  INSERT INTO test_results VALUES ('T25', v_count >= 3,
    'Entitlement audit entries: ' || v_count);

END $$;

-- ============================================================
-- Results
-- ============================================================
SELECT
  (SELECT count(*) FROM test_results WHERE passed) AS passed,
  (SELECT count(*) FROM test_results WHERE NOT passed) AS failed,
  (SELECT count(*) FROM test_results) AS total,
  (SELECT string_agg(test_id || ': ' || detail, '; ' ORDER BY test_id) FROM test_results WHERE NOT passed) AS failures;

ROLLBACK;

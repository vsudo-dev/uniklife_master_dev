-- Migration: 20261111_001_tenant_crm_tag.sql
-- Adds crm_contact_tag to tenants.
-- If set, the crm-webhook function only syncs contacts that carry this tag.
-- Null = sync all contacts (backward compatible).

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS crm_contact_tag TEXT;

-- Set the tag for Healthy Lifestyle tenant
UPDATE tenants SET crm_contact_tag = 'test_healthy-fitness' WHERE slug = 'healthy-lifestyle';

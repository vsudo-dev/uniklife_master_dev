-- CRM webhook mapping columns
-- Allows contacts to be upserted from CRM webhook events
-- and tenants to be matched by their CRM sub-account ID.

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS crm_contact_id TEXT,
  ADD COLUMN IF NOT EXISTS source         TEXT;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS crm_location_id TEXT;

-- Unique: one CRM contact per tenant (nulls excluded automatically)
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_crm_id
  ON contacts(tenant_id, crm_contact_id)
  WHERE crm_contact_id IS NOT NULL;

-- Unique: one tenant per CRM sub-account
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_crm_location
  ON tenants(crm_location_id)
  WHERE crm_location_id IS NOT NULL;


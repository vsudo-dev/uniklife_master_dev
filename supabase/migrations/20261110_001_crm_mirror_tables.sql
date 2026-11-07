-- Migration: 20261110_001_crm_mirror_tables.sql
-- Mirror tables for CRM-synced appointments and invoices.
-- Kept separate from platform appointments/invoices (which have strict NOT NULL FKs).
-- Platform → CRM write-back: handled by crm-sync-contact Edge Function.

-- ─── CRM Appointments mirror ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_appointments (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id            UUID NOT NULL REFERENCES tenants(id),
  contact_id           UUID REFERENCES contacts(id),       -- nullable: mapped after contact sync
  crm_appointment_id   TEXT NOT NULL,
  crm_contact_id       TEXT,
  title                TEXT,
  status               TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_at         TIMESTAMPTZ NOT NULL,
  end_at               TIMESTAMPTZ,
  calendar_id          TEXT,
  staff_name           TEXT,
  notes                TEXT,
  source               TEXT NOT NULL DEFAULT 'crm',
  raw                  JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_appointments_id
  ON crm_appointments(tenant_id, crm_appointment_id);

CREATE INDEX IF NOT EXISTS idx_crm_appointments_scheduled
  ON crm_appointments(tenant_id, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_appointments_contact
  ON crm_appointments(contact_id)
  WHERE contact_id IS NOT NULL;

ALTER TABLE crm_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_appointments_select" ON crm_appointments FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));

-- ─── CRM Invoices mirror ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_invoices (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id          UUID NOT NULL REFERENCES tenants(id),
  contact_id         UUID REFERENCES contacts(id),         -- nullable: mapped after contact sync
  crm_invoice_id     TEXT NOT NULL,
  crm_contact_id     TEXT,
  invoice_number     TEXT,
  amount             NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency           TEXT NOT NULL DEFAULT 'INR',
  status             TEXT NOT NULL DEFAULT 'draft',
  due_date           DATE,
  paid_at            TIMESTAMPTZ,
  source             TEXT NOT NULL DEFAULT 'crm',
  raw                JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_invoices_id
  ON crm_invoices(tenant_id, crm_invoice_id);

CREATE INDEX IF NOT EXISTS idx_crm_invoices_tenant
  ON crm_invoices(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_invoices_contact
  ON crm_invoices(contact_id)
  WHERE contact_id IS NOT NULL;

ALTER TABLE crm_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_invoices_select" ON crm_invoices FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));

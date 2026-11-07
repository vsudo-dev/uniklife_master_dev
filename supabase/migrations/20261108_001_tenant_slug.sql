-- Migration: 20261108_001_tenant_slug.sql
-- Adds slug column to tenants for clean URL routing: /t/:slug/dashboard

-- Helper: generate a URL-safe slug from any string
CREATE OR REPLACE FUNCTION generate_tenant_slug(p_name TEXT)
RETURNS TEXT
LANGUAGE SQL IMMUTABLE
AS $$
  SELECT trim(both '-' from
    regexp_replace(
      lower(p_name),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$;

-- Add nullable first so we can backfill
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill existing tenants from name
UPDATE tenants
SET slug = generate_tenant_slug(name)
WHERE slug IS NULL;

-- Make unique and required
ALTER TABLE tenants ALTER COLUMN slug SET NOT NULL;
ALTER TABLE tenants ADD CONSTRAINT tenants_slug_unique UNIQUE (slug);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

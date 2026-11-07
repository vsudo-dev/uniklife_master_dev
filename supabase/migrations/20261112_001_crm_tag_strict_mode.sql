-- Migration: 20261112_001_crm_tag_strict_mode.sql
-- Adds crm_tag_strict_mode to tenants.
-- false (default) = safe fallback: contacts with no tags in webhook payload are synced.
-- true = strict: contacts must explicitly carry the required tag to sync.
-- Toggle exists because CRM (MyAppz) has a bug where tag changes don't reflect in webhook payloads.

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS crm_tag_strict_mode BOOLEAN NOT NULL DEFAULT false;

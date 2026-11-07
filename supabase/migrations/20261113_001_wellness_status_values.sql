-- Migration: 20261112_002_wellness_status_values.sql
-- Extends enrollment_status CHECK constraint to include 'suspended' and 'deactivated'.
-- suspended  = client on a temporary break, will return
-- deactivated = profile disabled, data preserved, can be reactivated

ALTER TABLE wellness_clients DROP CONSTRAINT IF EXISTS wellness_clients_enrollment_status_check;

ALTER TABLE wellness_clients ADD CONSTRAINT wellness_clients_enrollment_status_check
  CHECK (enrollment_status IN ('registered', 'active', 'inactive', 'discharged', 'suspended', 'deactivated'));

-- Add payload JSONB column to support_action_requests
-- Stores the action parameters at request time so they're available at execution time
ALTER TABLE support_action_requests
  ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;

-- Delete stuck test requests created by SuperAdmin (self-approve constraint blocks review)
DELETE FROM support_action_requests
WHERE requester_id IN (
  SELECT id FROM platform_users WHERE platform_role = 'super_admin'
);

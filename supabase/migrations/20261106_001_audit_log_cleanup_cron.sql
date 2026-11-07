-- Migration: 20261105_002_audit_log_cleanup_cron.sql
-- Auto-delete audit_logs rows older than 90 days (runs daily at 3 AM UTC)

SELECT cron.schedule(
  'cleanup-audit-logs',
  '0 3 * * *',
  $$DELETE FROM public.audit_logs WHERE created_at < now() - interval '90 days'$$
);

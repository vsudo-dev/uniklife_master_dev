-- Phase 5A: Practitioner Workspace
-- client_notes: quick session/visit notes written by practitioners

CREATE TABLE client_notes (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  client_id       UUID NOT NULL REFERENCES wellness_clients(id),
  appointment_id  UUID REFERENCES appointments(id),
  written_by      UUID NOT NULL REFERENCES platform_users(id),
  note_type       TEXT NOT NULL DEFAULT 'session'
    CHECK (note_type IN ('session', 'progress', 'general', 'alert', 'follow_up')),
  content         TEXT NOT NULL,
  is_private      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_notes_client     ON client_notes(client_id, created_at DESC);
CREATE INDEX idx_client_notes_tenant     ON client_notes(tenant_id);
CREATE INDEX idx_client_notes_appt       ON client_notes(appointment_id) WHERE appointment_id IS NOT NULL;
CREATE INDEX idx_client_notes_practitioner ON client_notes(tenant_id, written_by, created_at DESC);

CREATE TRIGGER set_client_notes_updated_at
  BEFORE UPDATE ON client_notes
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- RLS: practitioners can only read notes they wrote OR notes for their assigned clients
-- private notes are only readable by the author
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_notes_select" ON client_notes FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (
      tenant_id IN (SELECT public.active_tenant_ids())
      AND (
        -- author always sees their own notes
        written_by = public.platform_user_id()
        -- tenant_admin sees non-private notes
        OR (NOT is_private AND public.tenant_role(tenant_id) = 'tenant_admin')
        -- assigned practitioners see non-private notes for their clients
        OR (
          NOT is_private
          AND EXISTS (
            SELECT 1 FROM coach_assignments ca
            WHERE ca.client_id = client_notes.client_id
              AND ca.practitioner_id = public.platform_user_id()
              AND ca.status = 'active'
          )
        )
      )
    )
  );

CREATE POLICY "client_notes_insert" ON client_notes FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      tenant_id IN (SELECT public.active_tenant_ids())
      AND public.tenant_role(tenant_id) IN ('tenant_admin', 'practitioner')
      AND written_by = public.platform_user_id()
    )
  );

CREATE POLICY "client_notes_update" ON client_notes FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR written_by = public.platform_user_id()
  )
  WITH CHECK (
    public.is_super_admin()
    OR written_by = public.platform_user_id()
  );

CREATE POLICY "client_notes_delete" ON client_notes FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR written_by = public.platform_user_id()
    OR public.tenant_role(tenant_id) = 'tenant_admin'
  );

CREATE TRIGGER audit_client_notes
  AFTER INSERT OR UPDATE OR DELETE ON client_notes
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

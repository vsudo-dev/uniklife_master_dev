-- Phase 5B: Finance Core
-- invoice_items (line items), payments
-- invoices table already exists from Phase 4

-- ── invoice_items ────────────────────────────────────────────────────────────

CREATE TABLE invoice_items (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id   UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES tenants(id),
  description  TEXT NOT NULL,
  quantity     NUMERIC(7,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price   NUMERIC(12,2) NOT NULL DEFAULT 0,
  total        NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  service_id   UUID REFERENCES services(id),
  program_id   UUID REFERENCES wellness_programs(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_tenant  ON invoice_items(tenant_id);

-- ── payments ─────────────────────────────────────────────────────────────────

CREATE TABLE payments (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  invoice_id     UUID NOT NULL REFERENCES invoices(id),
  contact_id     UUID NOT NULL REFERENCES contacts(id),
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency       TEXT NOT NULL DEFAULT 'INR',
  method         TEXT NOT NULL
    CHECK (method IN ('cash', 'card', 'upi', 'bank_transfer', 'cheque', 'other')),
  status         TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  reference_no   TEXT,
  payment_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  notes          TEXT,
  recorded_by    UUID NOT NULL REFERENCES platform_users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_tenant   ON payments(tenant_id);
CREATE INDEX idx_payments_invoice  ON payments(invoice_id);
CREATE INDEX idx_payments_contact  ON payments(contact_id);
CREATE INDEX idx_payments_date     ON payments(tenant_id, payment_date DESC);

CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments      ENABLE ROW LEVEL SECURITY;

-- invoice_items
CREATE POLICY "invoice_items_select" ON invoice_items FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "invoice_items_insert" ON invoice_items FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin', 'staff'));
CREATE POLICY "invoice_items_update" ON invoice_items FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin', 'staff'))
  WITH CHECK (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin', 'staff'));
CREATE POLICY "invoice_items_delete" ON invoice_items FOR DELETE TO authenticated
  USING (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin'));

-- payments
CREATE POLICY "payments_select" ON payments FOR SELECT TO authenticated
  USING (public.is_super_admin() OR tenant_id IN (SELECT public.active_tenant_ids()));
CREATE POLICY "payments_insert" ON payments FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin', 'staff'));
CREATE POLICY "payments_update" ON payments FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin'))
  WITH CHECK (public.is_super_admin() OR public.tenant_role(tenant_id) IN ('tenant_admin'));

-- ── Audit triggers ────────────────────────────────────────────────────────────

CREATE TRIGGER audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ── Helper view: invoice summary with paid/outstanding amounts ────────────────

CREATE OR REPLACE VIEW invoice_summary AS
SELECT
  i.id,
  i.tenant_id,
  i.contact_id,
  i.invoice_number,
  i.amount        AS total_amount,
  i.currency,
  i.status,
  i.due_date,
  i.paid_at,
  i.created_at,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0) AS paid_amount,
  i.amount - COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0) AS outstanding_amount
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.id
GROUP BY i.id;

COMMENT ON VIEW invoice_summary IS 'Invoice totals with computed paid and outstanding amounts';
